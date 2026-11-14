import { countsOnTrack } from "./ledger";
import { clamp, sportById, type Activity, type ReadinessMark, type SportId } from "./sports";

/**
 * Effort is mostly volume.
 * Heart rate can add up to 12%. Pace can add up to 8% on GPS sports.
 * Both weights are named so they can be tuned later, including decay.
 */
export const HR_WEIGHT = 0.12;
export const PACE_WEIGHT = 0.08;
/** A 100 readiness mark is worth this many effort points on the primary sport. */
export const READINESS_WEIGHT = 1.2;

export function activityEffort(activity: Activity): number {
  const sport = sportById(activity.sport);
  const hr =
    activity.avgHr == null
      ? 0
      : clamp(0, 1, (activity.avgHr - 110) / 70) * HR_WEIGHT;

  if (!sport.gps) {
    const hours = activity.movingSec / 3600;
    return hours * 8 * (1 + hr);
  }

  const km = activity.distanceM / 1000;
  if (km <= 0) return 0;
  let pace = 0;
  if (activity.distanceM > 500 && activity.movingSec > 0) {
    const basePace = sport.basePaceMinPerKm ?? 6.5;
    const minPerKm = activity.movingSec / 60 / km;
    pace = clamp(0, 1, (basePace - minPerKm) / basePace) * PACE_WEIGHT;
  }
  return km * (1 + hr + pace);
}

export function periodEffort(
  activities: Activity[],
  sport: SportId,
  periodStart: Date,
  periodEnd: Date,
  track: "verified" | "open",
): { effort: number; distanceM: number; movingSec: number } {
  let effort = 0;
  let distanceM = 0;
  let movingSec = 0;
  for (const activity of activities) {
    if (activity.sport !== sport) continue;
    const at = new Date(activity.startedAt);
    if (!Number.isFinite(at.getTime()) || at < periodStart || at >= periodEnd) continue;
    if (!countsOnTrack(activity, track)) continue;
    effort += activityEffort(activity);
    distanceM += activity.distanceM;
    movingSec += activity.movingSec;
  }
  return { effort, distanceM, movingSec };
}

export function readinessBonus(
  marks: ReadinessMark[],
  periodStart: Date,
  periodEnd: Date,
): number {
  let bonus = 0;
  for (const mark of marks) {
    const at = new Date(`${mark.day}T12:00:00.000Z`);
    if (!Number.isFinite(at.getTime()) || at < periodStart || at >= periodEnd) continue;
    bonus += clamp(0, 100, mark.score) / 100 * READINESS_WEIGHT;
  }
  return bonus;
}

/** Map a typical week of effort onto a starting elo. Linear on purpose. */
export function eloFromWeeklyEffort(weeklyEffort: number): number {
  return clamp(500, 2200, Math.round(900 + weeklyEffort * 12));
}

export type EffortBarCount = 1 | 2 | 3 | 4 | 5;
export type EffortTier = "easy" | "moderate" | "hard" | "all-out";
export interface SessionEffortSummary {
  bars: EffortBarCount;
  tier: EffortTier;
  ratio: number;
  basis: "effort" | "duration";
  hasBaseline: boolean;
}

export const EFFORT_BAR_HEIGHT_RATIOS = [0.28, 0.44, 0.62, 0.81, 1] as const;

export const EFFORT_TIER_LABELS: Record<EffortTier, string> = {
  easy: "Easy",
  moderate: "Moderate",
  hard: "Hard",
  "all-out": "All out",
};

/** Three layered podium colors across the 5 ascending effort bars: bronze -> silver -> gold. */
export const EFFORT_BAR_COLOR_ROLES = [
  "podiumBronze",
  "podiumBronze",
  "podiumSilver",
  "podiumSilver",
  "podiumGold",
] as const;

const THIRTY_DAYS_MS = 30 * 86_400_000;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Rate a session from 1..5 bars against a trailing 30-day baseline, preferring
 * same-sport effort points and falling back to moving duration when cross-sport
 * or effort history is unavailable.
 */
export function sessionEffortSummary(
  target: {
    id?: string;
    sport: SportId;
    distanceM: number;
    movingSec: number;
    startedAt: string;
    avgHr?: number | null;
  },
  history: readonly Activity[],
): SessionEffortSummary {
  const parsedEnd = Date.parse(target.startedAt);
  const endMs = Number.isFinite(parsedEnd) ? parsedEnd : Date.now();
  const startMs = endMs - THIRTY_DAYS_MS;
  const recent = history.filter((a) => {
    if (target.id && a.id === target.id) return false;
    if (!countsOnTrack(a, "open")) return false;
    const at = Date.parse(a.startedAt);
    return Number.isFinite(at) && at >= startMs && at <= endMs;
  });
  const sameSport = recent.filter((a) => a.sport === target.sport);
  const useSameSportPool = sameSport.length >= 2;
  const pool = useSameSportPool ? sameSport : recent;

  const targetEffort = activityEffort({
    id: target.id ?? "",
    sport: target.sport,
    startedAt: target.startedAt,
    distanceM: target.distanceM,
    movingSec: target.movingSec,
    avgHr: target.avgHr ?? undefined,
    verified: false,
    source: "manual",
  });
  // Effort points scale per sport; only compare effort against same-sport sessions.
  const baselineEfforts = useSameSportPool ? pool.map(activityEffort).filter((v) => v > 0) : [];
  const useEffort = targetEffort > 0 && baselineEfforts.length > 0;
  const targetValue = useEffort ? targetEffort : Math.max(0, target.movingSec);
  const baselineValues = useEffort
    ? baselineEfforts
    : pool.map((a) => a.movingSec).filter((v) => v > 0);
  const baseline = median(baselineValues);
  const hasBaseline = baseline > 0;
  const ratio = hasBaseline ? targetValue / baseline : 1;

  const bars: EffortBarCount =
    ratio < 0.65 ? 1 : ratio < 0.9 ? 2 : ratio < 1.15 ? 3 : ratio < 1.45 ? 4 : 5;
  const tier: EffortTier =
    bars <= 2 ? "easy" : bars === 3 ? "moderate" : bars === 4 ? "hard" : "all-out";
  return { bars, tier, ratio, basis: useEffort ? "effort" : "duration", hasBaseline };
}
