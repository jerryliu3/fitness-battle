import type { PeriodBounds } from "../period";
import {
  DensityMatcher,
  buildLocalBoard,
  enrollmentFromCrewPlan,
  planFromCrewBoardPin,
  poolFromCrewPlan,
  waveWindowAt,
  type PoolPlayer,
  type WaveEnrollment,
} from "../matching";
import { eloFromWeeklyEffort, periodEffort } from "./effort";
import { mergeActivities, normalizeSampleActivity, provenanceOf } from "./ledger";
import { isTrainingGoal } from "./suggestion";
import { settleElo } from "./elo";
import {
  demoSleepNight,
  freshHealthRatings,
  providerRecordsSleep,
  settleSleepWeeks,
  type CategoryFocus,
  type HealthMetricId,
  type SleepNight,
} from "./health";
import {
  acknowledgePeriodResults,
  appendPeriodResults,
  pendingRevealIdsFromResults,
  periodResultId,
  shouldSyncLegacyPendingReveals,
  syncPeriodResultAcknowledgements,
} from "./history";
import {
  ELO_BASE,
  PROVIDERS,
  SPORT_IDS,
  SPORTS,
  STARTING_FREEZES,
  clamp,
  dayKey,
  hashString,
  sportById,
  unitInterval,
  type Activity,
  type CompeteState,
  type CrewBoardPin,
  type PeriodResult,
  type ProviderId,
  type ReadinessMark,
  type Rating,
  type ScoreTrack,
  type SportId,
} from "./sports";

const densityMatcher = new DensityMatcher();

/** Optional real-player pool for density matching (empty in solo local demo). */
let realPlayerPool: PoolPlayer[] = [];

/** Test/demo hook: inject overlapping real peers into density matching. */
export function setRealPlayerPool(pool: readonly PoolPlayer[]): void {
  realPlayerPool = [...pool];
}

export function getRealPlayerPool(): readonly PoolPlayer[] {
  return realPlayerPool;
}

export interface Action {
  type:
    | "rename"
    | "set-city"
    | "set-primary"
    | "set-focus"
    | "opt-in"
    | "opt-out"
    | "opt-in-health"
    | "opt-out-health"
    | "log-sleep"
    | "link"
    | "unlink"
  | "sync"
  | "apply-sync"
  | "import-history"
    | "complete-lesson"
    | "complete-onboarding"
    | "freeze"
    | "duel"
    | "acknowledge-reveal"
    | "set-disposition"
    | "set-training-goal"
    | "clear-training-goal"
    /** Pin this account to a crew’s shared individual field for one sport. */
    | "set-crew-board"
    | "clear-crew-board"
    /** Demo/dev: settle the open week as if Monday UTC already arrived. */
    | "debug-close-week";
  name?: string;
  city?: string;
  sport?: SportId;
  metric?: HealthMetricId;
  focus?: CategoryFocus;
  provider?: ProviderId;
  /** Shared crew field plan from /api/crews/field. */
  crewBoard?: CrewBoardPin | null;
  /** Account id used as the viewer when seating a crew field. */
  accountId?: string;
  /** Sleep nights already mapped from a tracker pull. */
  sleepNights?: SleepNight[];
  score?: number;
  durationMin?: number;
  level?: "light" | "steady" | "heavy";
  username?: string;
  mode?: "auto" | "invite";
  now?: string;
  /** Tracker rows already mapped onto the compete activity shape. */
  activities?: Activity[];
  /** Daily recovery marks from WHOOP or Oura. */
  readiness?: ReadinessMark[];
  linkStatus?: "stub" | "connected";
  /** Demo mode may invent a local session. Live mode must not. */
  allowSample?: boolean;
  /** Result ids to clear from the pending reveal queue. */
  revealIds?: string[];
  activityId?: string;
  disposition?: "counted" | "pending" | "excluded";
  goalDistance?: "5k" | "10k" | "half" | "marathon";
  deadline?: string;
}

function rating(state: CompeteState, sport: SportId): Rating {
  const found = state.ratings.find((item) => item.sport === sport);
  if (!found) throw new Error(`missing_rating:${sport}`);
  return found;
}

function withRating(
  state: CompeteState,
  sport: SportId,
  patch: Partial<Rating>,
): CompeteState {
  return {
    ...state,
    ratings: state.ratings.map((item) =>
      item.sport === sport ? { ...item, ...patch } : item,
    ),
  };
}

/** Normalize persisted JSON from older clients (missing link status / onboarding). */
export function migrateCompeteState(parsed: CompeteState): CompeteState {
  const wave = waveWindowAt(new Date());
  const fallbackPeriodStart = wave.waveStart.toISOString();
  const clock =
    parsed.clock &&
    typeof parsed.clock === "object" &&
    typeof parsed.clock.periodStart === "string"
      ? parsed.clock
      : { kind: "weekly" as const, periodStart: fallbackPeriodStart };

  const existingRatings = new Map(
    (Array.isArray(parsed.ratings) ? parsed.ratings : []).map((r) => [r.sport, r]),
  );
  const ratings = SPORT_IDS.map((sport) => {
    const existing = existingRatings.get(sport);
    if (!existing) {
      return {
        sport,
        verifiedElo: ELO_BASE,
        openElo: ELO_BASE,
        optedIn: false,
        lockVerified: ELO_BASE,
        lockOpen: ELO_BASE,
        lockPeriod: clock.periodStart,
      };
    }
    return existing;
  });

  const existingLinks = new Map(
    (Array.isArray(parsed.links) ? parsed.links : []).map((link) => [link.provider, link]),
  );
  const links = PROVIDERS.map((provider) => {
    const existing = existingLinks.get(provider.id);
    if (!existing) {
      return {
        provider: provider.id,
        linked: false,
        status: "disconnected" as const,
      };
    }
    return {
      provider: provider.id,
      linked: Boolean(existing.linked),
      status:
        "status" in existing && existing.status
          ? existing.status
          : existing.linked
            ? ("stub" as const)
            : ("disconnected" as const),
    };
  });

  const rawPeriodResults = Array.isArray(
    (parsed as CompeteState).periodResults,
  )
    ? (parsed as CompeteState).periodResults
    : [];
  const legacyPending = Array.isArray(
    (parsed as CompeteState).pendingRevealIds,
  )
    ? (parsed as CompeteState).pendingRevealIds
    : undefined;
  const periodResults = shouldSyncLegacyPendingReveals(
    rawPeriodResults,
    legacyPending,
  )
    ? syncPeriodResultAcknowledgements(rawPeriodResults, legacyPending)
    : rawPeriodResults;
  const pendingRevealIds = pendingRevealIdsFromResults(periodResults);
  const enrollments = Array.isArray((parsed as CompeteState).enrollments)
    ? (parsed as CompeteState).enrollments
    : [];
  return {
    ...parsed,
    clock,
    ratings,
    links,
    calibrated: Boolean(parsed.calibrated),
    onboardingCompleted: Boolean(
      (parsed as CompeteState).onboardingCompleted,
    ),
    periodResults,
    pendingRevealIds,
    enrollments,
    demoNow:
      typeof (parsed as CompeteState).demoNow === "string"
        ? (parsed as CompeteState).demoNow
        : null,
    focus:
      parsed.focus?.family === "health" || parsed.focus?.family === "sport"
        ? parsed.focus
        : { family: "sport", id: parsed.primary },
    sleepNights: Array.isArray(parsed.sleepNights) ? parsed.sleepNights : [],
    healthRatings:
      Array.isArray(parsed.healthRatings) && parsed.healthRatings.length > 0
        ? freshHealthRatings(clock.periodStart).map((blank) => {
            const found = parsed.healthRatings.find((item) => item.metric === blank.metric);
            return found ? { ...blank, ...found } : blank;
          })
        : freshHealthRatings(clock.periodStart),
    healthResults: Array.isArray(parsed.healthResults) ? parsed.healthResults : [],
    activities: Array.isArray(parsed.activities)
      ? parsed.activities.map(normalizeSampleActivity)
      : [],
    trainingGoal: isTrainingGoal(parsed.trainingGoal) ? parsed.trainingGoal : null,
    crewBoard: isCrewBoardPin((parsed as CompeteState).crewBoard)
      ? (parsed as CompeteState).crewBoard
      : null,
  };
}

function isCrewBoardPin(value: unknown): value is CrewBoardPin {
  if (!value || typeof value !== "object") return false;
  const pin = value as CrewBoardPin;
  return (
    typeof pin.crewId === "string" &&
    typeof pin.crewName === "string" &&
    typeof pin.sport === "string" &&
    typeof pin.waveStart === "string" &&
    typeof pin.weekEnd === "string" &&
    typeof pin.capacity === "number" &&
    Array.isArray(pin.memberIds) &&
    Array.isArray(pin.members) &&
    Array.isArray(pin.syntheticIds)
  );
}

export function freshState(now: Date = new Date()): CompeteState {
  const wave = waveWindowAt(now);
  const periodStart = wave.waveStart.toISOString();
  return {
    version: 1,
    name: "You",
    city: "Toronto",
    primary: "running",
    focus: { family: "sport", id: "running" },
    clock: { kind: "weekly", periodStart },
    ratings: SPORT_IDS.map((sport) => ({
      sport,
      verifiedElo: ELO_BASE,
      openElo: ELO_BASE,
      optedIn: false,
      lockVerified: ELO_BASE,
      lockOpen: ELO_BASE,
      lockPeriod: periodStart,
    })),
    activities: [],
    readiness: [],
    sleepNights: [],
    healthRatings: freshHealthRatings(periodStart),
    healthResults: [],
    links: PROVIDERS.map((provider) => ({
      provider: provider.id,
      linked: false,
      status: "disconnected" as const,
    })),
    freezesLeft: STARTING_FREEZES,
    frozenPeriods: [],
    duels: [],
    lessonDoneOn: null,
    calibrated: false,
    onboardingCompleted: false,
    periodResults: [],
    pendingRevealIds: [],
    trainingGoal: null,
    demoNow: null,
    enrollments: [],
    crewBoard: null,
  };
}

function enrollmentFor(
  state: CompeteState,
  sport: SportId,
): WaveEnrollment | undefined {
  return state.enrollments.find((item) => item.sport === sport);
}

function waveBoundsFor(
  state: CompeteState,
  sport: SportId,
  now: Date,
): PeriodBounds {
  const enrollment = enrollmentFor(state, sport);
  if (enrollment) {
    return {
      kind: "weekly",
      startsAt: new Date(enrollment.waveStart),
      endsAt: new Date(enrollment.weekEnd),
    };
  }
  const wave = waveWindowAt(now);
  return { kind: "weekly", startsAt: wave.waveStart, endsAt: wave.weekEnd };
}

function enrollSport(
  state: CompeteState,
  sport: SportId,
  now: Date,
  viewerId = "you",
): CompeteState {
  const mine = rating(state, sport);
  const pin = state.crewBoard;
  const waveStart = waveWindowAt(now).waveStart.toISOString();

  const enrollment =
    pin && pin.sport === sport && pin.waveStart === waveStart
      ? enrollmentFromCrewPlan(planFromCrewBoardPin(pin), viewerId)
      : densityMatcher.assignGroup({
          viewerId,
          viewerName: state.name,
          viewerElo: mine.openElo,
          sport,
          now,
          realPool: realPlayerPool,
          seed: `${viewerId}:${sport}:${waveStart}`,
          autoEnrollNext: true,
        }).enrollment;

  return {
    ...withRating(state, sport, {
      optedIn: true,
      lockVerified: mine.verifiedElo,
      lockOpen: mine.openElo,
      lockPeriod: enrollment.waveStart,
    }),
    enrollments: [
      ...state.enrollments.filter((item) => item.sport !== sport),
      enrollment,
    ],
    clock: { ...state.clock, periodStart: enrollment.waveStart },
  };
}

/** Stub activities so crew mates use shared counted volume, not Elo guesses. */
function crewPeerActivities(
  pin: CrewBoardPin,
  viewerId: string,
): Map<string, Activity[]> {
  const map = new Map<string, Activity[]>();
  for (const member of pin.members) {
    if (member.id === viewerId) continue;
    if (member.distanceM == null && member.movingSec == null) continue;
    map.set(member.id, [
      {
        id: `crew-week:${pin.crewId}:${member.id}`,
        sport: pin.sport,
        startedAt: pin.waveStart,
        distanceM: member.distanceM ?? 0,
        movingSec: member.movingSec ?? 0,
        avgHr: null,
        verified: false,
        source: "manual",
        provenance: "recorded",
        disposition: "counted",
      },
    ]);
  }
  return map;
}

function effectiveNow(state: CompeteState, actionNow?: string): Date {
  if (actionNow) return new Date(actionNow);
  if (state.demoNow) return new Date(state.demoNow);
  return new Date();
}

/** Wall clock, or pinned demoNow when QA has advanced the week. */
export function competeNow(
  state: CompeteState,
  fallback: Date = new Date(),
): Date {
  return state.demoNow ? new Date(state.demoNow) : fallback;
}

function groupFor(
  state: CompeteState,
  sport: SportId,
  track: ScoreTrack,
  enrollment: WaveEnrollment,
  asOf: Date,
): { id: string; name: string; elo: number; effort: number; distanceM: number; movingSec: number; you: boolean }[] {
  const mine = rating(state, sport);
  const pin =
    state.crewBoard?.sport === sport && enrollment.crewId === state.crewBoard.crewId
      ? state.crewBoard
      : null;
  const fromPool = realPlayerPool.filter((player) =>
    enrollment.peerIds.includes(player.id),
  );
  const fromCrew = pin
    ? poolFromCrewPlan(planFromCrewBoardPin(pin), "you").filter((player) =>
        enrollment.peerIds.includes(player.id),
      )
    : [];
  const seen = new Set(fromPool.map((peer) => peer.id));
  const peers = [...fromPool, ...fromCrew.filter((peer) => !seen.has(peer.id))];
  const rows = buildLocalBoard({
    enrollment,
    viewer: {
      id: "you",
      name: state.name,
      elo: track === "verified" ? mine.verifiedElo : mine.openElo,
      activities: state.activities,
      readiness: state.readiness,
      primarySport: state.primary,
    },
    peers,
    peerActivities: pin ? crewPeerActivities(pin, "you") : undefined,
    track,
    asOf,
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    elo: row.elo,
    effort: row.effort,
    distanceM: row.distanceM,
    movingSec: row.movingSec,
    you: row.you,
  }));
}

function settleTrackResult(input: {
  state: CompeteState;
  sport: SportId;
  track: ScoreTrack;
  periodStart: string;
  periodEnd: Date;
  place: number;
  fieldSize: number;
  effort: number;
  distanceM: number;
  movingSec: number;
  eloBefore: number;
  eloAfter: number;
  frozen: boolean;
  settledAt: string;
}): PeriodResult {
  return {
    id: periodResultId(input.periodStart, input.sport, input.track),
    periodStart: input.periodStart,
    periodEnd: input.periodEnd.toISOString(),
    sport: input.sport,
    track: input.track,
    place: input.place + 1,
    fieldSize: input.fieldSize,
    effort: input.effort,
    distanceM: input.distanceM,
    movingSec: input.movingSec,
    eloBefore: input.eloBefore,
    eloAfter: input.eloAfter,
    frozen: input.frozen,
    settledAt: input.settledAt,
    acknowledgedAt: null,
  };
}

function settleEnrollment(
  state: CompeteState,
  enrollment: WaveEnrollment,
): CompeteState {
  const periodStart = enrollment.waveStart;
  const end = new Date(enrollment.weekEnd);
  const frozen = state.frozenPeriods.includes(periodStart);
  const settledAt = new Date().toISOString();
  const sport = enrollment.sport;
  const current = rating(state, sport);
  if (!current.optedIn) {
    return {
      ...state,
      enrollments: state.enrollments.filter((item) => item.sport !== sport),
    };
  }

  const asOf = end;
  const verifiedRows = groupFor(state, sport, "verified", enrollment, asOf);
  const openRows = groupFor(state, sport, "open", enrollment, asOf);
  const verifiedIdx = verifiedRows.findIndex((row) => row.you);
  const openIdx = openRows.findIndex((row) => row.you);
  const verifiedPlace = verifiedIdx >= 0 ? verifiedIdx : Math.max(0, verifiedRows.length - 1);
  const openPlace = openIdx >= 0 ? openIdx : Math.max(0, openRows.length - 1);
  const verifiedEffort = verifiedIdx >= 0 ? (verifiedRows[verifiedIdx]?.effort ?? 0) : 0;
  const openEffort = openIdx >= 0 ? (openRows[openIdx]?.effort ?? 0) : 0;
  const youVerified = verifiedIdx >= 0 ? verifiedRows[verifiedIdx] : undefined;
  const youOpen = openIdx >= 0 ? openRows[openIdx] : undefined;
  const gps = sportById(sport).gps;
  const nextVerified = gps
    ? settleElo(
        current.verifiedElo,
        verifiedRows.filter((row) => !row.you).map((row) => row.elo),
        verifiedPlace,
        verifiedRows.length,
        verifiedEffort,
        frozen,
      )
    : current.verifiedElo;
  const nextOpen = settleElo(
    current.openElo,
    openRows.filter((row) => !row.you).map((row) => row.elo),
    openPlace,
    openRows.length,
    openEffort,
    frozen,
  );

  const additions: PeriodResult[] = [
    settleTrackResult({
      state,
      sport,
      track: "open",
      periodStart,
      periodEnd: end,
      place: openPlace,
      fieldSize: openRows.length,
      effort: openEffort,
      distanceM: youOpen?.distanceM ?? 0,
      movingSec: youOpen?.movingSec ?? 0,
      eloBefore: current.openElo,
      eloAfter: nextOpen,
      frozen,
      settledAt,
    }),
  ];
  if (gps) {
    additions.push(
      settleTrackResult({
        state,
        sport,
        track: "verified",
        periodStart,
        periodEnd: end,
        place: verifiedPlace,
        fieldSize: verifiedRows.length,
        effort: verifiedEffort,
        distanceM: youVerified?.distanceM ?? 0,
        movingSec: youVerified?.movingSec ?? 0,
        eloBefore: current.verifiedElo,
        eloAfter: nextVerified,
        frozen,
        settledAt,
      }),
    );
  }

  let next = withRating(state, sport, {
    verifiedElo: nextVerified,
    openElo: nextOpen,
  });
  const periodResults = appendPeriodResults(next.periodResults, additions);
  next = {
    ...next,
    periodResults,
    pendingRevealIds: pendingRevealIdsFromResults(periodResults),
    enrollments: next.enrollments.filter((item) => item.sport !== sport),
  };

  if (enrollment.autoEnrollNext) {
    // Next week opens at Monday 00:00 UTC (weekEnd).
    next = enrollSport(next, sport, end);
  } else {
    next = withRating(next, sport, { optedIn: false });
  }
  return next;
}

/**
 * Close any finished wave enrollments. Safe to call on every load.
 * After a long gap we settle at most 12 waves for Elo continuity, then
 * jump remaining enrollments to the live daily wave.
 */
export function rollClock(state: CompeteState, now: Date = new Date()): CompeteState {
  const liveWave = waveWindowAt(now);
  const liveStart = liveWave.waveStart.toISOString();
  let next = state;
  // Last week's crew pin must not stick after Monday settlement.
  if (next.crewBoard && next.crewBoard.waveStart !== liveStart) {
    next = { ...next, crewBoard: null };
  }
  next = ensureEnrollments(next, now);
  let guard = 0;

  while (guard < 12) {
    const due = next.enrollments
      .filter((item) => item.weekEnd <= now.toISOString())
      .sort((a, b) => a.weekEnd.localeCompare(b.weekEnd));
    if (due.length === 0) break;
    next = settleEnrollment(next, due[0]!);
    guard += 1;
  }

  // Long gap: drop stale enrollments and re-seat on the live wave.
  if (next.enrollments.some((item) => item.weekEnd <= now.toISOString())) {
    const opted = next.ratings.filter((item) => item.optedIn).map((item) => item.sport);
    next = {
      ...next,
      enrollments: [],
      clock: { ...next.clock, periodStart: liveStart },
      ratings: next.ratings.map((item) => ({
        ...item,
        lockVerified: item.verifiedElo,
        lockOpen: item.openElo,
        lockPeriod: liveStart,
      })),
    };
    for (const sport of opted) {
      next = enrollSport(next, sport, now);
    }
  }

  if (next.clock.periodStart !== liveStart && next.enrollments.length === 0) {
    next = {
      ...next,
      clock: { ...next.clock, periodStart: liveStart },
    };
  }
  return settleSleepWeeks(next, now, next.demoNow ?? now.toISOString());
}

/** Backfill wave seats for opted-in sports missing an enrollment (migrations). */
function ensureEnrollments(state: CompeteState, now: Date): CompeteState {
  let next = state;
  for (const item of state.ratings) {
    if (!item.optedIn) continue;
    if (enrollmentFor(next, item.sport)) continue;
    next = enrollSport(next, item.sport, now);
  }
  return next;
}

function lockSport(
  state: CompeteState,
  sport: SportId,
  now: Date,
  viewerId = "you",
): CompeteState {
  return enrollSport(state, sport, now, viewerId);
}

function makeActivity(
  sport: SportId,
  startedAt: Date,
  distanceM: number,
  movingSec: number,
  avgHr: number,
  verified: boolean,
  source: Activity["source"],
  provenance: Activity["provenance"] = "recorded",
): Activity {
  return {
    id: `act-${hashString(`${sport}:${startedAt.toISOString()}:${distanceM}:${source}`).toString(16)}`,
    sport,
    startedAt: startedAt.toISOString(),
    distanceM,
    movingSec,
    avgHr,
    verified: provenance === "recorded" && verified,
    source,
    provenance,
    disposition: "counted",
  };
}

function historyFor(level: "light" | "steady" | "heavy", now: Date): Activity[] {
  const volume = level === "light" ? 0.7 : level === "heavy" ? 1.4 : 1;
  const runDays = level === "light" ? 3 : level === "heavy" ? 6 : 4;
  const activities: Activity[] = [];
  for (let day = 1; day <= 90; day += 1) {
    const at = new Date(now);
    at.setUTCDate(at.getUTCDate() - day);
    at.setUTCHours(13, 0, 0, 0);
    const key = dayKey(at);
    if (hashString(`run:${key}`) % 7 < runDays) {
      const km = (4 + unitInterval(`run-km:${key}`) * 7) * volume;
      const minPerKm = 5.3 + unitInterval(`run-pace:${key}`) * 1.6;
      activities.push(
        makeActivity(
          "running",
          at,
          km * 1000,
          km * minPerKm * 60,
          136 + Math.round(unitInterval(`run-hr:${key}`) * 24),
          false,
          "history",
          "demo",
        ),
      );
    }
    if (hashString(`ride:${key}`) % (level === "heavy" ? 4 : 6) === 0) {
      const km = (16 + unitInterval(`ride-km:${key}`) * 28) * volume;
      activities.push(
        makeActivity("cycling", at, km * 1000, km * 2.05 * 60, 130, false, "history", "demo"),
      );
    }
    if (hashString(`walk:${key}`) % 4 === 0) {
      const km = (2.5 + unitInterval(`walk-km:${key}`) * 4) * volume;
      activities.push(
        makeActivity("walking", at, km * 1000, km * 12 * 60, 108, false, "history", "demo"),
      );
    }
    if (hashString(`lift:${key}`) % (level === "light" ? 4 : 3) === 0) {
      const minutes = (22 + Math.round(unitInterval(`lift-min:${key}`) * 28)) * volume;
      activities.push(
        makeActivity("strength", at, 0, minutes * 60, 124, false, "history", "demo"),
      );
    }
  }
  return activities;
}

function calibrate(state: CompeteState, now: Date): CompeteState {
  let next = state;
  for (const sport of SPORT_IDS) {
    let openSum = 0;
    let verifiedSum = 0;
    let weeks = 0;
    for (let back = 0; back < 90; back += 7) {
      const end = new Date(now);
      end.setUTCDate(end.getUTCDate() - back);
      const start = new Date(end);
      start.setUTCDate(start.getUTCDate() - 7);
      const open = periodEffort(state.activities, sport, start, end, "open").effort;
      const verified = periodEffort(
        state.activities,
        sport,
        start,
        end,
        "verified",
      ).effort;
      if (open <= 0) continue;
      openSum += open;
      verifiedSum += verified;
      weeks += 1;
    }
    if (weeks === 0) continue;
    const openElo = eloFromWeeklyEffort(openSum / weeks);
    const verifiedElo = sportById(sport).gps
      ? eloFromWeeklyEffort(verifiedSum / weeks)
      : ELO_BASE;
    next = withRating(next, sport, {
      openElo,
      verifiedElo,
      lockOpen: openElo,
      lockVerified: verifiedElo,
      lockPeriod: state.clock.periodStart,
    });
  }
  return { ...next, calibrated: true };
}

function syncProvider(
  state: CompeteState,
  provider: ProviderId,
  now: Date,
): CompeteState {
  const meta = PROVIDERS.find((item) => item.id === provider);
  if (!meta) return state;
  const day = dayKey(now);
  let next = state;
  if (providerRecordsSleep(provider)) {
    const night = demoSleepNight(provider, day);
    if (!next.sleepNights.some((item) => item.id === night.id)) {
      next = { ...next, sleepNights: [...next.sleepNights, night] };
    }
  }
  if (meta.kind === "readiness") {
    if (next.readiness.some((mark) => mark.provider === provider && mark.day === day)) {
      return next;
    }
    const score = 62 + Math.round(unitInterval(`${provider}:${day}`) * 30);
    return {
      ...next,
      readiness: [
        ...next.readiness,
        { id: `ready-${provider}-${day}`, provider, day, score },
      ],
    };
  }
  const sport = next.primary;
  const already = next.activities.some(
    (activity) =>
      activity.source === provider && activity.startedAt.slice(0, 10) === day,
  );
  if (already) return next;
  const gps = sportById(sport).gps;
  const km = gps ? 5 + unitInterval(`${provider}:km:${day}`) * 8 : 0;
  const minutes = gps
    ? km * (5.2 + unitInterval(`${provider}:pace:${day}`))
    : 30 + unitInterval(`${provider}:min:${day}`) * 25;
  const activity = makeActivity(
    sport,
    now,
    km * 1000,
    minutes * 60,
    140 + Math.round(unitInterval(`${provider}:hr:${day}`) * 18),
    false,
    provider,
    "demo",
  );
  activity.dispositionReason = "Sample session. Not a live tracker pull.";
  return { ...next, activities: [...next.activities, activity] };
}

function mergeSleepNights(state: CompeteState, incoming: SleepNight[]): CompeteState {
  if (incoming.length === 0) return state;
  const seen = new Set(state.sleepNights.map((night) => night.id));
  const added = incoming.filter((night) => {
    if (night.metric !== "sleep" || seen.has(night.id)) return false;
    seen.add(night.id);
    return true;
  });
  if (added.length === 0) return state;
  return { ...state, sleepNights: [...state.sleepNights, ...added] };
}

export function reduceCompete(
  state: CompeteState,
  action: Action,
): CompeteState {
  const now = effectiveNow(state, action.now);
  const rolled = rollClock(state, now);
  switch (action.type) {
    case "rename": {
      const name = action.name?.trim().slice(0, 32);
      return name ? { ...rolled, name } : rolled;
    }
    case "set-city": {
      const city = action.city?.trim().slice(0, 40);
      return city ? { ...rolled, city } : rolled;
    }
    case "set-primary": {
      if (!action.sport) return rolled;
      return {
        ...rolled,
        primary: action.sport,
        focus: { family: "sport", id: action.sport },
      };
    }
    case "set-focus": {
      if (!action.focus) return rolled;
      return { ...rolled, focus: action.focus };
    }
    case "opt-in": {
      if (!action.sport) return rolled;
      // Together: crewBoard pin. Alone: crewBoard null. Omit to leave pin as-is.
      let next: CompeteState = rolled;
      if (action.crewBoard !== undefined) {
        next = {
          ...rolled,
          crewBoard:
            action.crewBoard && isCrewBoardPin(action.crewBoard)
              ? action.crewBoard
              : null,
        };
      }
      next = lockSport(next, action.sport, now, action.accountId ?? "you");
      const anyPrimary = next.ratings.some(
        (item) => item.optedIn && item.sport === next.primary,
      );
      if (!anyPrimary) next = { ...next, primary: action.sport };
      return { ...next, focus: { family: "sport", id: action.sport } };
    }
    case "opt-out": {
      if (!action.sport) return rolled;
      const enrollment = enrollmentFor(rolled, action.sport);
      const periodStart = enrollment?.waveStart ?? rolled.clock.periodStart;
      const clearCrew =
        rolled.crewBoard?.sport === action.sport ? null : rolled.crewBoard;
      return {
        ...withRating(rolled, action.sport, { optedIn: false }),
        crewBoard: clearCrew,
        enrollments: rolled.enrollments.filter(
          (item) => item.sport !== action.sport,
        ),
        duels: rolled.duels.filter(
          (duel) =>
            !(duel.sport === action.sport && duel.periodStart === periodStart),
        ),
      };
    }
    case "set-crew-board": {
      if (!action.crewBoard || !isCrewBoardPin(action.crewBoard)) return rolled;
      const pin = action.crewBoard;
      const viewerId = action.accountId ?? "you";
      let next: CompeteState = { ...rolled, crewBoard: pin };
      const ratingRow = rating(next, pin.sport);
      if (ratingRow.optedIn) {
        next = enrollSport(next, pin.sport, now, viewerId);
      }
      return next;
    }
    case "clear-crew-board": {
      const pin = rolled.crewBoard;
      let next: CompeteState = { ...rolled, crewBoard: null };
      if (pin) {
        const ratingRow = rating(next, pin.sport);
        if (ratingRow.optedIn) {
          next = enrollSport(next, pin.sport, now, action.accountId ?? "you");
        } else {
          next = {
            ...next,
            enrollments: next.enrollments.filter(
              (item) => item.sport !== pin.sport || !item.crewId,
            ),
          };
        }
      }
      return next;
    }
    case "opt-in-health": {
      const metric = action.metric ?? "sleep";
      const waveStart = waveWindowAt(now).waveStart.toISOString();
      return {
        ...rolled,
        focus: { family: "health", id: metric },
        healthRatings: rolled.healthRatings.map((item) =>
          item.metric === metric
            ? {
                ...item,
                optedIn: true,
                lockElo: item.elo,
                lockPeriod: waveStart,
                autoEnrollNext: true,
              }
            : item,
        ),
      };
    }
    case "opt-out-health": {
      const metric = action.metric ?? "sleep";
      return {
        ...rolled,
        focus:
          rolled.focus.family === "health" && rolled.focus.id === metric
            ? { family: "sport", id: rolled.primary }
            : rolled.focus,
        healthRatings: rolled.healthRatings.map((item) =>
          item.metric === metric ? { ...item, optedIn: false } : item,
        ),
      };
    }
    case "log-sleep": {
      const day = dayKey(now);
      if (rolled.sleepNights.some((night) => night.source === "manual" && night.day === day)) {
        return { ...rolled, focus: { family: "health", id: "sleep" } };
      }
      const durationMin = action.durationMin ?? 7 * 60 + 20;
      const score = action.score;
      const night = demoSleepNight("manual", day);
      const logged: SleepNight = {
        ...night,
        id: `sleep-manual-${day}`,
        score:
          score == null
            ? night.score
            : Math.min(100, Math.max(0, Math.round(score))),
        durationMin,
        verified: false,
        source: "manual",
      };
      return {
        ...rolled,
        focus: { family: "health", id: "sleep" },
        sleepNights: [...rolled.sleepNights, logged],
      };
    }
    case "link": {
      if (!action.provider) return rolled;
      // Demo/stub link only — never claim a live OAuth connection here.
      // Real Strava connect goes through /api/fitness/* and reports status=stub|connected.
      return {
        ...rolled,
        links: rolled.links.map((link) =>
          link.provider === action.provider
            ? { ...link, linked: true, status: "stub" as const }
            : link,
        ),
      };
    }
    case "unlink": {
      if (!action.provider) return rolled;
      return {
        ...rolled,
        links: rolled.links.map((link) =>
          link.provider === action.provider
            ? { ...link, linked: false, status: "disconnected" as const }
            : link,
        ),
      };
    }
    case "complete-onboarding":
      return { ...rolled, onboardingCompleted: true };
    case "sync": {
      if (!action.provider || !action.allowSample) return rolled;
      const link = rolled.links.find((item) => item.provider === action.provider);
      if (!link?.linked) return rolled;
      return syncProvider(rolled, action.provider, now);
    }
    case "apply-sync": {
      if (!action.provider) return rolled;
      const incoming = (action.activities ?? []).filter(
        (activity) => activity.source === action.provider,
      );
      const merged = mergeActivities(rolled.activities, incoming);
      const linkStatus = action.linkStatus;
      const links = linkStatus
        ? rolled.links.map((link) =>
            link.provider === action.provider
              ? { ...link, linked: true, status: linkStatus }
              : link,
          )
        : rolled.links;
      const seenReady = new Set(rolled.readiness.map((mark) => mark.id));
      const ready = (action.readiness ?? []).filter((mark) => {
        if (mark.provider !== action.provider || seenReady.has(mark.id)) return false;
        if (mark.score < 0 || mark.score > 100 || !/^\d{4}-\d{2}-\d{2}$/.test(mark.day)) {
          return false;
        }
        seenReady.add(mark.id);
        return true;
      });
      return mergeSleepNights(
        {
          ...rolled,
          activities: merged,
          readiness: ready.length ? [...rolled.readiness, ...ready] : rolled.readiness,
          links,
        },
        (action.sleepNights ?? []).filter((night) => night.source === action.provider),
      );
    }
    case "import-history": {
      // One-time calibration only. Re-importing would rewrite Elo and is blocked.
      if (rolled.calibrated) return rolled;
      const level = action.level ?? "steady";
      const kept = rolled.activities.filter((activity) => activity.source !== "history");
      const activities = [...kept, ...historyFor(level, now)];
      const calibrated = calibrate({ ...rolled, activities }, now);
      return {
        ...calibrated,
        activities: calibrated.activities.map((activity) =>
          provenanceOf(activity) === "demo"
            ? {
                ...activity,
                verified: false,
                disposition: "excluded" as const,
                dispositionReason:
                  "Sample calibration. It set a starting rating and is not a counted workout.",
              }
            : activity,
        ),
      };
    }
    case "complete-lesson":
      return { ...rolled, lessonDoneOn: dayKey(now) };
    case "freeze": {
      const primaryEnrollment = enrollmentFor(rolled, rolled.primary);
      const periodStart =
        primaryEnrollment?.waveStart ?? rolled.clock.periodStart;
      if (rolled.frozenPeriods.includes(periodStart) || rolled.freezesLeft <= 0) {
        return rolled;
      }
      return {
        ...rolled,
        freezesLeft: rolled.freezesLeft - 1,
        frozenPeriods: [...rolled.frozenPeriods, periodStart],
      };
    }
    case "duel":
      // Practice 1v1 was removed from the product. Keep the action no-op so
      // older clients and persisted payloads cannot reintroduce matchups.
      return rolled.duels.length === 0 ? rolled : { ...rolled, duels: [] };
    case "set-disposition": {
      if (!action.activityId || !action.disposition) return rolled;
      const disposition = action.disposition;
      return {
        ...rolled,
        activities: rolled.activities.map((activity) =>
          activity.id === action.activityId
            ? {
                ...activity,
                disposition,
                dispositionReason:
                  disposition === "counted"
                    ? "You counted this session."
                    : disposition === "excluded"
                      ? "You left this session out of the week."
                      : "Waiting for you to count this session.",
              }
            : activity,
        ),
      };
    }
    case "set-training-goal": {
      const goal = {
        distance: action.goalDistance,
        deadline: action.deadline?.trim() ?? "",
      };
      if (!isTrainingGoal(goal)) return rolled;
      return { ...rolled, trainingGoal: goal };
    }
    case "clear-training-goal":
      return { ...rolled, trainingGoal: null };
    case "acknowledge-reveal": {
      const periodResults = acknowledgePeriodResults(
        rolled.periodResults,
        action.revealIds ?? null,
      );
      return {
        ...rolled,
        periodResults,
        pendingRevealIds: pendingRevealIdsFromResults(periodResults),
      };
    }
    case "debug-close-week": {
      // Product settlement is load-time (rollClock). Advance past the active
      // wave's Monday weekEnd and pin demoNow so the new wave sticks.
      const primaryEnrollment = enrollmentFor(rolled, rolled.primary);
      const end = primaryEnrollment
        ? new Date(primaryEnrollment.weekEnd)
        : waveWindowAt(now).weekEnd;
      const demoNow = new Date(end.getTime() + 60_000).toISOString();
      return rollClock({ ...rolled, demoNow }, new Date(demoNow));
    }
    default:
      return rolled;
  }
}

export interface BoardRow {
  id: string;
  name: string;
  elo: number;
  effort: number;
  distanceM: number;
  movingSec: number;
  you: boolean;
  place: number;
}

export function weeklyBoard(
  state: CompeteState,
  sport: SportId,
  track: ScoreTrack,
  now: Date = new Date(),
): BoardRow[] {
  const live = rollClock(state, now);
  const enrollment = enrollmentFor(live, sport);
  if (!enrollment) return [];
  const rows = groupFor(live, sport, track, enrollment, now);
  return rows.map((row, index) => ({
    ...row,
    place: index + 1,
  }));
}

export function projectedElo(
  state: CompeteState,
  sport: SportId,
  track: ScoreTrack,
  now: Date = new Date(),
): number {
  const live = rollClock(state, now);
  const enrollment = enrollmentFor(live, sport);
  if (!enrollment) {
    const next = rating(live, sport);
    return track === "verified" ? next.verifiedElo : next.openElo;
  }
  const settled = settleEnrollment(
    {
      ...live,
      enrollments: live.enrollments.map((item) =>
        item.sport === sport ? { ...item, autoEnrollNext: false } : item,
      ),
    },
    { ...enrollment, autoEnrollNext: false },
  );
  const next = rating(settled, sport);
  return track === "verified" ? next.verifiedElo : next.openElo;
}

export function formatClock(bounds: PeriodBounds): string {
  const start = bounds.startsAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const end = new Date(bounds.endsAt.getTime() - 1).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${start} – ${end}`;
}

export function daysLeft(bounds: PeriodBounds, now: Date): number {
  return clamp(
    0,
    7,
    Math.ceil((bounds.endsAt.getTime() - now.getTime()) / 86400000),
  );
}

export function formatVolume(sport: SportId, distanceM: number, movingSec: number): string {
  if (sportById(sport).gps) {
    return `${(distanceM / 1000).toFixed(1)} km`;
  }
  return `${Math.round(movingSec / 60)} min`;
}

export function formatEffort(value: number): string {
  return value.toFixed(1);
}

export { SPORTS };
