import { activityBaseTrainingXp } from './training-xp';
import type { DailyHealthSample } from "../fitness/types";
import { countsForTraining, walkingStepsInPeriod } from "./journal";
import { countsOnTrack } from "./ledger";
import { type Activity, type SportId } from "./sports";

/** Competition transport uses native distance/time; placement rules are unchanged. */
export function activityCompetitionVolume(activity: Pick<Activity, 'sport' | 'distanceM' | 'movingSec'>): number {
  return activity.sport === 'strength' ? Math.max(0, activity.movingSec) : activity.sport === 'walking' ? 0 : Math.max(0, activity.distanceM);
}

export function periodEffort(
  activities: Activity[],
  sport: SportId,
  periodStart: Date,
  periodEnd: Date,
  track: "verified" | "open",
  opts?: { dailyHealth?: readonly DailyHealthSample[]; now?: Date },
): { effort: number; distanceM: number; movingSec: number } {
  if (sport === "walking" && track === "open") {
    const now = opts?.now ?? new Date();
    const steps = walkingStepsInPeriod(
      opts?.dailyHealth,
      periodStart,
      periodEnd,
      now,
    );
    return { effort: steps, distanceM: 0, movingSec: 0 };
  }
  let effort = 0;
  let distanceM = 0;
  let movingSec = 0;
  for (const activity of activities) {
    if (activity.sport !== sport) continue;
    const at = new Date(activity.startedAt);
    if (!Number.isFinite(at.getTime()) || at < periodStart || at >= periodEnd) continue;
    if (!countsOnTrack(activity, track)) continue;
    effort += activityCompetitionVolume(activity);
    distanceM += activity.distanceM;
    movingSec += activity.movingSec;
  }
  return { effort, distanceM, movingSec };
}

export type WorkoutSizeBarCount = 1 | 2 | 3 | 4 | 5;
export type WorkoutSizeTier = "small" | "typical" | "large" | "very-large";
export interface WorkoutSizeSummary {
  bars: WorkoutSizeBarCount;
  tier: WorkoutSizeTier;
  ratio: number;
  hasBaseline: boolean;
}

export const WORKOUT_SIZE_BAR_HEIGHT_RATIOS = [0.28, 0.44, 0.62, 0.81, 1] as const;

export const WORKOUT_SIZE_LABELS: Record<WorkoutSizeTier, string> = {
  small: "Easy",
  typical: "Moderate",
  large: "Hard",
  "very-large": "All out",
};

/** Progress from bronze and silver to Medal Gold for the highest effort tier. */
export const WORKOUT_SIZE_BAR_COLOR_ROLES = [
  "actionPrimary",
  "actionPrimary",
  "podiumSilver",
  "podiumSilver",
  "actionPrimary",
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
 * same-sport Training XP and falling back to moving duration when cross-sport
 * or training history is unavailable.
 */
export function workoutSizeSummary(
  target: {
    id?: string;
    sport: SportId;
    distanceM: number;
    movingSec: number;
    startedAt: string;
    avgHr?: number | null;
  },
  history: readonly Activity[],
): WorkoutSizeSummary {
  const parsedEnd = Date.parse(target.startedAt);
  const endMs = Number.isFinite(parsedEnd) ? parsedEnd : Date.now();
  const startMs = endMs - THIRTY_DAYS_MS;
  const recent = history.filter((a) => {
    if (target.id && a.id === target.id) return false;
    if (!countsForTraining(a)) return false;
    const at = Date.parse(a.startedAt);
    return Number.isFinite(at) && at >= startMs && at <= endMs;
  });
  const sameSport = recent.filter((a) => a.sport === target.sport);
  const useSameSportPool = sameSport.length >= 2;
  const pool = useSameSportPool ? sameSport : recent;

  const targetEffort = activityBaseTrainingXp({
    id: target.id ?? "",
    sport: target.sport,
    startedAt: target.startedAt,
    distanceM: target.distanceM,
    movingSec: target.movingSec,
    avgHr: target.avgHr ?? null,
    verified: false,
    source: "manual",
    provenance: "manual",
  });
  // Compare XP within a sport; cross-sport session size uses duration.
  const baselineEfforts = useSameSportPool ? pool.map(activityBaseTrainingXp).filter((v) => v > 0) : [];
  const useEffort = targetEffort > 0 && baselineEfforts.length > 0;
  const targetValue = useEffort ? targetEffort : Math.max(0, target.movingSec);
  const baselineValues = useEffort
    ? baselineEfforts
    : pool.map((a) => a.movingSec).filter((v) => v > 0);
  const baseline = median(baselineValues);
  const hasBaseline = baseline > 0;
  const ratio = hasBaseline ? targetValue / baseline : 1;

  const bars: WorkoutSizeBarCount =
    ratio < 0.65 ? 1 : ratio < 0.9 ? 2 : ratio < 1.15 ? 3 : ratio < 1.45 ? 4 : 5;
  const tier: WorkoutSizeTier =
    bars <= 2 ? "small" : bars === 3 ? "typical" : bars === 4 ? "large" : "very-large";
  return { bars, tier, ratio, hasBaseline };
}
