import type { PeriodBounds } from "../period";
import {
  DensityMatcher,
  buildLocalBoard,
  waveWindowAt,
  type PoolPlayer,
  type WaveEnrollment,
} from "../matching";
import { eloFromWeeklyEffort, periodEffort, readinessBonus } from "./effort";
import { settleElo } from "./elo";
import {
  athleteWeekEffort,
  findAthlete,
  nearestAthletes,
} from "./field";
import {
  appendPeriodResults,
  periodResultId,
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
  type Duel,
  type PeriodResult,
  type ProviderId,
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
    | "opt-in"
    | "opt-out"
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
    /** Demo/dev: settle the open week as if Monday UTC already arrived. */
    | "debug-close-week";
  name?: string;
  city?: string;
  sport?: SportId;
  provider?: ProviderId;
  level?: "light" | "steady" | "heavy";
  username?: string;
  mode?: "auto" | "invite";
  now?: string;
  /** Tracker rows already mapped onto the compete activity shape. */
  activities?: Activity[];
  linkStatus?: "stub" | "connected";
  /** Result ids to clear from the pending reveal queue. */
  revealIds?: string[];
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
  const links = (parsed.links ?? []).map((link) => ({
    provider: link.provider,
    linked: Boolean(link.linked),
    status:
      "status" in link && link.status
        ? link.status
        : link.linked
          ? ("stub" as const)
          : ("disconnected" as const),
  }));
  const periodResults = Array.isArray(
    (parsed as CompeteState).periodResults,
  )
    ? (parsed as CompeteState).periodResults
    : [];
  const pendingRevealIds = Array.isArray(
    (parsed as CompeteState).pendingRevealIds,
  )
    ? (parsed as CompeteState).pendingRevealIds
    : [];
  const enrollments = Array.isArray((parsed as CompeteState).enrollments)
    ? (parsed as CompeteState).enrollments
    : [];
  return {
    ...parsed,
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
  };
}

export function freshState(now: Date = new Date()): CompeteState {
  const wave = waveWindowAt(now);
  const periodStart = wave.waveStart.toISOString();
  return {
    version: 1,
    name: "You",
    city: "Toronto",
    primary: "running",
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
    demoNow: null,
    enrollments: [],
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
): CompeteState {
  const mine = rating(state, sport);
  const assignment = densityMatcher.assignGroup({
    viewerId: "you",
    viewerName: state.name,
    viewerElo: mine.openElo,
    sport,
    now,
    realPool: realPlayerPool,
    seed: `you:${sport}:${waveWindowAt(now).waveStart.toISOString()}`,
    autoEnrollNext: true,
  });
  const enrollments = [
    ...state.enrollments.filter((item) => item.sport !== sport),
    assignment.enrollment,
  ];
  return {
    ...withRating(state, sport, {
      optedIn: true,
      lockVerified: mine.verifiedElo,
      lockOpen: mine.openElo,
      lockPeriod: assignment.enrollment.waveStart,
    }),
    enrollments,
    clock: { ...state.clock, periodStart: assignment.enrollment.waveStart },
  };
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
  const peers = realPlayerPool.filter((player) =>
    enrollment.peerIds.includes(player.id),
  );
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
  const verifiedPlace = verifiedRows.findIndex((row) => row.you);
  const openPlace = openRows.findIndex((row) => row.you);
  const verifiedEffort = verifiedRows[verifiedPlace]?.effort ?? 0;
  const openEffort = openRows[openPlace]?.effort ?? 0;
  const youVerified = verifiedRows[verifiedPlace];
  const youOpen = openRows[openPlace];
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
  next = {
    ...next,
    periodResults: appendPeriodResults(next.periodResults, additions),
    pendingRevealIds: [
      ...new Set([...next.pendingRevealIds, ...additions.map((row) => row.id)]),
    ],
    enrollments: next.enrollments.filter((item) => item.sport !== sport),
  };

  if (enrollment.autoEnrollNext) {
    // Next wave opens at the Sunday reset instant (weekEnd).
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
  let next = ensureEnrollments(state, now);
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
    return {
      ...next,
      clock: { ...next.clock, periodStart: liveStart },
    };
  }
  return next;
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

function lockSport(state: CompeteState, sport: SportId, now: Date): CompeteState {
  return enrollSport(state, sport, now);
}

function makeActivity(
  sport: SportId,
  startedAt: Date,
  distanceM: number,
  movingSec: number,
  avgHr: number,
  verified: boolean,
  source: Activity["source"],
): Activity {
  return {
    id: `act-${hashString(`${sport}:${startedAt.toISOString()}:${distanceM}:${source}`).toString(16)}`,
    sport,
    startedAt: startedAt.toISOString(),
    distanceM,
    movingSec,
    avgHr,
    verified,
    source,
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
          true,
          "history",
        ),
      );
    }
    if (hashString(`ride:${key}`) % (level === "heavy" ? 4 : 6) === 0) {
      const km = (16 + unitInterval(`ride-km:${key}`) * 28) * volume;
      activities.push(
        makeActivity("cycling", at, km * 1000, km * 2.05 * 60, 130, true, "history"),
      );
    }
    if (hashString(`walk:${key}`) % 4 === 0) {
      const km = (2.5 + unitInterval(`walk-km:${key}`) * 4) * volume;
      activities.push(
        makeActivity("walking", at, km * 1000, km * 12 * 60, 108, true, "history"),
      );
    }
    if (hashString(`lift:${key}`) % (level === "light" ? 4 : 3) === 0) {
      const minutes = (22 + Math.round(unitInterval(`lift-min:${key}`) * 28)) * volume;
      activities.push(
        makeActivity("strength", at, 0, minutes * 60, 124, false, "history"),
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
  if (meta.kind === "readiness") {
    if (state.readiness.some((mark) => mark.provider === provider && mark.day === day)) {
      return state;
    }
    const score = 62 + Math.round(unitInterval(`${provider}:${day}`) * 30);
    return {
      ...state,
      readiness: [
        ...state.readiness,
        { id: `ready-${provider}-${day}`, provider, day, score },
      ],
    };
  }
  const sport = state.primary;
  const already = state.activities.some(
    (activity) =>
      activity.source === provider && activity.startedAt.slice(0, 10) === day,
  );
  if (already) return state;
  const gps = sportById(sport).gps;
  const verified = gps && hashString(`${provider}:${day}`) % 4 !== 0;
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
    verified,
    provider,
  );
  return { ...state, activities: [...state.activities, activity] };
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
      return { ...rolled, primary: action.sport };
    }
    case "opt-in": {
      if (!action.sport) return rolled;
      const opted = lockSport(rolled, action.sport, now);
      const anyPrimary = opted.ratings.some(
        (item) => item.optedIn && item.sport === opted.primary,
      );
      return anyPrimary ? opted : { ...opted, primary: action.sport };
    }
    case "opt-out": {
      if (!action.sport) return rolled;
      const enrollment = enrollmentFor(rolled, action.sport);
      const periodStart = enrollment?.waveStart ?? rolled.clock.periodStart;
      return {
        ...withRating(rolled, action.sport, { optedIn: false }),
        enrollments: rolled.enrollments.filter(
          (item) => item.sport !== action.sport,
        ),
        duels: rolled.duels.filter(
          (duel) =>
            !(duel.sport === action.sport && duel.periodStart === periodStart),
        ),
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
      if (!action.provider) return rolled;
      const link = rolled.links.find((item) => item.provider === action.provider);
      if (!link?.linked) return rolled;
      return syncProvider(rolled, action.provider, now);
    }
    case "apply-sync": {
      if (!action.provider) return rolled;
      const seen = new Set(rolled.activities.map((activity) => activity.id));
      const added = (action.activities ?? []).filter((activity) => {
        if (activity.source !== action.provider || seen.has(activity.id)) return false;
        seen.add(activity.id);
        return true;
      });
      const linkStatus = action.linkStatus;
      const links = linkStatus
        ? rolled.links.map((link) =>
            link.provider === action.provider
              ? { ...link, linked: true, status: linkStatus }
              : link,
          )
        : rolled.links;
      return {
        ...rolled,
        activities: added.length ? [...rolled.activities, ...added] : rolled.activities,
        links,
      };
    }
    case "import-history": {
      // One-time calibration only. Re-importing would rewrite Elo and is blocked.
      if (rolled.calibrated) return rolled;
      const level = action.level ?? "steady";
      const kept = rolled.activities.filter((activity) => activity.source !== "history");
      const activities = [...kept, ...historyFor(level, now)];
      return calibrate({ ...rolled, activities }, now);
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
    case "duel": {
      const sport = action.sport ?? rolled.primary;
      const enrolled = enrollmentFor(rolled, sport);
      const periodStart = enrolled?.waveStart ?? rolled.clock.periodStart;
      const existing = rolled.duels.find(
        (duel) => duel.sport === sport && duel.periodStart === periodStart,
      );
      if (existing) return rolled;
      const mine = rating(rolled, sport);
      let rivalId = "";
      let rivalName = "";
      let rivalElo = mine.openElo;
      if (action.mode === "invite") {
        const username = action.username?.trim() ?? "";
        if (!username) return rolled;
        const known = findAthlete(sport, username);
        rivalId = known?.id ?? `guest:${username.toLowerCase()}`;
        rivalName = known?.name ?? username;
        rivalElo = known?.elo ?? mine.openElo;
      } else {
        const taken = rolled.duels
          .filter((duel) => duel.periodStart === periodStart)
          .map((duel) => duel.rivalId);
        const match = nearestAthletes(sport, mine.openElo, 1, taken)[0];
        if (!match) return rolled;
        rivalId = match.id;
        rivalName = match.name;
        rivalElo = match.elo;
      }
      const duel: Duel = {
        id: `duel-${sport}-${periodStart}`,
        sport,
        periodStart,
        rivalId,
        rivalName,
        rivalElo,
        source: action.mode === "invite" ? "invite" : "auto",
      };
      const opted = mine.optedIn ? rolled : lockSport(rolled, sport, now);
      return { ...opted, duels: [...opted.duels, duel] };
    }
    case "acknowledge-reveal": {
      const clearAll = !action.revealIds || action.revealIds.length === 0;
      if (clearAll) {
        return { ...rolled, pendingRevealIds: [] };
      }
      const clear = new Set(action.revealIds);
      return {
        ...rolled,
        pendingRevealIds: rolled.pendingRevealIds.filter((id) => !clear.has(id)),
      };
    }
    case "debug-close-week": {
      // Product settlement is load-time (rollClock). Advance past the active
      // wave's Sunday weekEnd and pin demoNow so the new wave sticks.
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

export interface DuelView {
  duel: Duel;
  youEffort: number;
  rivalEffort: number;
  youDistanceM: number;
  leading: "you" | "rival" | "tie";
}

export function duelViews(state: CompeteState, now: Date = new Date()): DuelView[] {
  const live = rollClock(state, now);
  return live.duels
    .map((duel) => {
      const bounds = waveBoundsFor(live, duel.sport, now);
      if (duel.periodStart !== bounds.startsAt.toISOString()) return null;
      const volume = periodEffort(
        live.activities,
        duel.sport,
        bounds.startsAt,
        bounds.endsAt,
        "open",
      );
      const bonus =
        live.primary === duel.sport
          ? readinessBonus(live.readiness, bounds.startsAt, bounds.endsAt)
          : 0;
      const youEffort = volume.effort + bonus;
      const rivalEffort = athleteWeekEffort(
        {
          id: duel.rivalId,
          name: duel.rivalName,
          city: "",
          elo: duel.rivalElo,
        },
        duel.periodStart,
        "open",
      );
      const leading =
        Math.abs(youEffort - rivalEffort) < 0.05
          ? "tie"
          : youEffort > rivalEffort
            ? "you"
            : "rival";
      return {
        duel,
        youEffort,
        rivalEffort,
        youDistanceM: volume.distanceM,
        leading,
      };
    })
    .filter((row): row is DuelView => row != null);
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
