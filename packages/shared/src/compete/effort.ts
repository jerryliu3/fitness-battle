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
    const minPerKm = activity.movingSec / 60 / km;
    pace = clamp(0, 1, (6.5 - minPerKm) / 6.5) * PACE_WEIGHT;
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
    if (at < periodStart || at >= periodEnd) continue;
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
    if (at < periodStart || at >= periodEnd) continue;
    bonus += clamp(0, 100, mark.score) / 100 * READINESS_WEIGHT;
  }
  return bonus;
}

/** Map a typical week of effort onto a starting elo. Linear on purpose. */
export function eloFromWeeklyEffort(weeklyEffort: number): number {
  return clamp(500, 2200, Math.round(900 + weeklyEffort * 12));
}
