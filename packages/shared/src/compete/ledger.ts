import { dayKey } from "../period";
import { isJournalActivity } from "./journal";
import {
  activityProvenancePrecedence,
  dispositionOf,
  isSampleActivity,
  isVerifiedActivity,
  normalizeSampleActivity,
  provenanceOf,
  type ActivityDisposition,
  type ActivityProvenance,
} from "./activity-meta";
import { sportById, type Activity, type SportId } from "./sports";

export type { ActivityDisposition, ActivityProvenance };
export {
  dispositionOf,
  isSampleActivity,
  isSampleActivityId,
  isVerifiedActivity,
  normalizeSampleActivity,
  provenanceOf,
} from "./activity-meta";

export function countsOnTrack(
  activity: Activity,
  track: "open" | "verified",
): boolean {
  if (isSampleActivity(activity)) return false;
  if (dispositionOf(activity) !== "counted") return false;
  if (isJournalActivity(activity)) return false;
  if (track === "verified") return isVerifiedActivity(activity);
  return true;
}

export function sameWorkout(left: Activity, right: Activity): boolean {
  if (left.sport !== right.sport) return false;
  const startGap = Math.abs(
    new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime(),
  );
  if (Number.isNaN(startGap) || startGap > 120_000) return false;
  if (!sportById(left.sport).gps) {
    const timeGap = Math.abs(left.movingSec - right.movingSec);
    const toleranceSec = Math.max(120, Math.max(left.movingSec, right.movingSec) * 0.1);
    return timeGap <= toleranceSec;
  }
  const distanceGap = Math.abs(left.distanceM - right.distanceM);
  const tolerance = Math.max(200, Math.max(left.distanceM, right.distanceM) * 0.05);
  return distanceGap <= tolerance;
}

function prefer(left: Activity, right: Activity): Activity {
  const leftRank = activityProvenancePrecedence[provenanceOf(left)];
  const rightRank = activityProvenancePrecedence[provenanceOf(right)];
  if (leftRank !== rightRank) return leftRank > rightRank ? left : right;
  return Date.parse(left.startedAt) <= Date.parse(right.startedAt) ? left : right;
}

export function mergeActivities(
  existing: Activity[],
  incoming: Activity[],
): Activity[] {
  const next = existing.map((activity) =>
    isSampleActivity(activity) ? normalizeSampleActivity(activity) : { ...activity },
  );
  for (const raw of incoming) {
    const activity = isSampleActivity(raw)
      ? normalizeSampleActivity(raw)
      : { ...raw };
    const twinIndex = next.findIndex(
      (item) =>
        item.id === activity.id ||
        (dispositionOf(item) !== "excluded" &&
          dispositionOf(activity) !== "excluded" &&
          sameWorkout(item, activity)),
    );
    if (twinIndex < 0) {
      next.push(activity);
      continue;
    }
    const twin = next[twinIndex]!;
    if (twin.id === activity.id) {
      const excluded = activity.disposition === "excluded";
      next[twinIndex] = isSampleActivity(activity)
        ? normalizeSampleActivity(activity)
        : {
            ...activity,
            disposition: excluded ? "excluded" : dispositionOf(twin),
            dispositionReason: excluded
              ? (activity.dispositionReason ?? twin.dispositionReason)
              : twin.dispositionReason,
          };
      continue;
    }
    const winner = prefer(twin, activity);
    const loser = winner.id === activity.id ? twin : activity;
    next[twinIndex] = isSampleActivity(winner)
      ? normalizeSampleActivity(winner)
      : {
          ...winner,
          disposition: dispositionOf(winner) === "pending" ? "pending" : "counted",
        };
    const excluded: Activity = {
      ...loser,
      disposition: "excluded",
      verified: false,
      dispositionReason: `Already counted from ${provenanceOf(winner)} ${winner.source}.`,
    };
    const loserIndex = next.findIndex((item) => item.id === excluded.id);
    if (loserIndex >= 0) next[loserIndex] = excluded;
    else next.push(excluded);
  }
  return next;
}

export function paceMinPerKm(activity: Activity): number | null {
  if (!sportById(activity.sport).gps) return null;
  if (activity.distanceM < 500 || activity.movingSec <= 0) return null;
  return activity.movingSec / 60 / (activity.distanceM / 1000);
}

export interface TrendPoint {
  day: string;
  value: number;
}

export function progressionTrends(
  activities: Activity[],
  sport: SportId,
  eloPoints: { day: string; elo: number }[],
): { distance: TrendPoint[]; pace: TrendPoint[]; elo: TrendPoint[] } {
  const distanceByDay = new Map<string, number>();
  const paceByDay = new Map<string, { sec: number; meters: number }>();
  for (const activity of activities) {
    if (activity.sport !== sport) continue;
    if (isSampleActivity(activity)) continue;
    if (dispositionOf(activity) !== "counted") continue;
    const day = dayKey(new Date(activity.startedAt));
    distanceByDay.set(day, (distanceByDay.get(day) ?? 0) + activity.distanceM / 1000);
    const bucket = paceByDay.get(day) ?? { sec: 0, meters: 0 };
    bucket.sec += activity.movingSec;
    bucket.meters += activity.distanceM;
    paceByDay.set(day, bucket);
  }
  const days = [...distanceByDay.keys()].sort();
  return {
    distance: days.map((day) => ({
      day,
      value: Math.round((distanceByDay.get(day) ?? 0) * 10) / 10,
    })),
    pace: days.flatMap((day) => {
      const bucket = paceByDay.get(day);
      if (!bucket || bucket.meters < 500) return [];
      const value = Math.round((bucket.sec / 60 / (bucket.meters / 1000)) * 10) / 10;
      return [{ day, value }];
    }),
    elo: [...eloPoints].sort((a, b) => a.day.localeCompare(b.day)).map((point) => ({
      day: point.day,
      value: point.elo,
    })),
  };
}