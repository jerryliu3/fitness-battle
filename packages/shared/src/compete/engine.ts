import { currentPeriodBounds, type PeriodBounds } from "../period";
import { eloFromWeeklyEffort, periodEffort, readinessBonus } from "./effort";
import { settleElo } from "./elo";
import {
  athleteWeekEffort,
  findAthlete,
  nearestAthletes,
} from "./field";
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
  type ProviderId,
  type Rating,
  type ScoreTrack,
  type SportId,
} from "./sports";

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
    | "import-history"
    | "complete-lesson"
    | "complete-onboarding"
    | "freeze"
    | "duel";
  name?: string;
  city?: string;
  sport?: SportId;
  provider?: ProviderId;
  level?: "light" | "steady" | "heavy";
  username?: string;
  mode?: "auto" | "invite";
  now?: string;
}

function boundsOf(state: CompeteState, now: Date): PeriodBounds {
  return currentPeriodBounds(state.clock.kind, now);
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
  return {
    ...parsed,
    links,
    calibrated: Boolean(parsed.calibrated),
    onboardingCompleted: Boolean(
      (parsed as CompeteState).onboardingCompleted,
    ),
  };
}

export function freshState(now: Date = new Date()): CompeteState {
  const period = currentPeriodBounds("weekly", now);
  const periodStart = period.startsAt.toISOString();
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
  };
}

function advanceStart(state: CompeteState, periodStart: string): string {
  const start = new Date(periodStart);
  const end = currentPeriodBounds(state.clock.kind, start).endsAt;
  return currentPeriodBounds(state.clock.kind, end).startsAt.toISOString();
}

function groupFor(
  state: CompeteState,
  sport: SportId,
  track: ScoreTrack,
  periodStart: string,
  periodEnd: Date,
): { id: string; name: string; elo: number; effort: number; you: boolean }[] {
  const mine = rating(state, sport);
  const lock = track === "verified" ? mine.lockVerified : mine.lockOpen;
  const rivals = nearestAthletes(sport, lock, 7);
  const rows = rivals.map((athlete) => ({
    id: athlete.id,
    name: athlete.name,
    elo: athlete.elo,
    effort: athleteWeekEffort(athlete, periodStart, track),
    you: false,
  }));
  const volume = periodEffort(
    state.activities,
    sport,
    new Date(periodStart),
    periodEnd,
    track,
  );
  const bonus =
    track === "verified" && state.primary === sport
      ? readinessBonus(state.readiness, new Date(periodStart), periodEnd)
      : 0;
  rows.push({
    id: "you",
    name: state.name,
    elo: track === "verified" ? mine.verifiedElo : mine.openElo,
    effort: volume.effort + bonus,
    you: true,
  });
  rows.sort((a, b) => b.effort - a.effort || a.name.localeCompare(b.name));
  return rows;
}

function settlePeriod(state: CompeteState, periodStart: string): CompeteState {
  const start = new Date(periodStart);
  const end = currentPeriodBounds(state.clock.kind, start).endsAt;
  const frozen = state.frozenPeriods.includes(periodStart);
  let next = state;
  for (const sport of SPORT_IDS) {
    const current = rating(next, sport);
    if (!current.optedIn) continue;
    const verifiedRows = groupFor(next, sport, "verified", periodStart, end);
    const openRows = groupFor(next, sport, "open", periodStart, end);
    const verifiedPlace = verifiedRows.findIndex((row) => row.you);
    const openPlace = openRows.findIndex((row) => row.you);
    const verifiedEffort = verifiedRows[verifiedPlace]?.effort ?? 0;
    const openEffort = openRows[openPlace]?.effort ?? 0;
    const gps = sportById(sport).gps;
    next = withRating(next, sport, {
      verifiedElo: gps
        ? settleElo(
            current.verifiedElo,
            verifiedRows.filter((row) => !row.you).map((row) => row.elo),
            verifiedPlace,
            verifiedRows.length,
            verifiedEffort,
            frozen,
          )
        : current.verifiedElo,
      openElo: settleElo(
        current.openElo,
        openRows.filter((row) => !row.you).map((row) => row.elo),
        openPlace,
        openRows.length,
        openEffort,
        frozen,
      ),
    });
  }
  return next;
}

/**
 * Close any finished periods. Safe to call on every load.
 * After a long gap we settle at most 12 periods for Elo continuity, then
 * jump the clock to the live window so the UI never sticks on a stale week.
 */
export function rollClock(state: CompeteState, now: Date = new Date()): CompeteState {
  const currentStart = boundsOf(state, now).startsAt.toISOString();
  let next = state;
  let guard = 0;
  while (next.clock.periodStart < currentStart && guard < 12) {
    next = settlePeriod(next, next.clock.periodStart);
    const periodStart = advanceStart(next, next.clock.periodStart);
    next = {
      ...next,
      clock: { ...next.clock, periodStart },
      ratings: next.ratings.map((item) => ({
        ...item,
        lockVerified: item.verifiedElo,
        lockOpen: item.openElo,
        lockPeriod: periodStart,
      })),
    };
    guard += 1;
  }
  if (next.clock.periodStart !== currentStart) {
    return {
      ...next,
      clock: { ...next.clock, periodStart: currentStart },
      ratings: next.ratings.map((item) => ({
        ...item,
        lockVerified: item.verifiedElo,
        lockOpen: item.openElo,
        lockPeriod: currentStart,
      })),
    };
  }
  return next;
}

function lockSport(state: CompeteState, sport: SportId, now: Date): CompeteState {
  const periodStart = boundsOf(state, now).startsAt.toISOString();
  const current = rating(state, sport);
  return withRating(state, sport, {
    optedIn: true,
    lockVerified: current.verifiedElo,
    lockOpen: current.openElo,
    lockPeriod: periodStart,
  });
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
  const now = action.now ? new Date(action.now) : new Date();
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
      return withRating(rolled, action.sport, { optedIn: false });
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
      const periodStart = rolled.clock.periodStart;
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
      const periodStart = rolled.clock.periodStart;
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
  const period = boundsOf(live, now);
  const rows = groupFor(
    live,
    sport,
    track,
    period.startsAt.toISOString(),
    period.endsAt,
  );
  return rows.map((row, index) => {
    const volume =
      row.you
        ? periodEffort(
            live.activities,
            sport,
            period.startsAt,
            period.endsAt,
            track,
          )
        : { distanceM: 0, movingSec: 0, effort: row.effort };
    return {
      ...row,
      distanceM: row.you ? volume.distanceM : 0,
      movingSec: row.you ? volume.movingSec : 0,
      place: index + 1,
    };
  });
}

export function projectedElo(
  state: CompeteState,
  sport: SportId,
  track: ScoreTrack,
  now: Date = new Date(),
): number {
  const live = rollClock(state, now);
  const settled = settlePeriod(live, live.clock.periodStart);
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
  const period = boundsOf(live, now);
  return live.duels
    .filter((duel) => duel.periodStart === period.startsAt.toISOString())
    .map((duel) => {
      const volume = periodEffort(
        live.activities,
        duel.sport,
        period.startsAt,
        period.endsAt,
        "open",
      );
      const bonus =
        live.primary === duel.sport
          ? readinessBonus(live.readiness, period.startsAt, period.endsAt)
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
    });
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
