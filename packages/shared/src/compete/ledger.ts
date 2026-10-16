import { sportById, type Activity, type SportId } from "./sports";

/** How a session entered the product. Demo rows are never a live tracker pull. */
export type ActivityProvenance = "recorded" | "imported" | "manual" | "demo";

/** Whether the session changes this week's score. */
export type ActivityDisposition = "counted" | "pending" | "excluded";

const PRECEDENCE: Record<ActivityProvenance, number> = {
  recorded: 4,
  imported: 3,
  manual: 2,
  demo: 1,
};

export function provenanceOf(activity: Activity): ActivityProvenance {
  if (activity.provenance) return activity.provenance;
  if (activity.source === "history") return "demo";
  return "recorded";
}

/** Calibration rows predate provenance and must not score or be shared. */
export function isSampleActivity(activity: Activity): boolean {
  return activity.source === "history" || provenanceOf(activity) === "demo";
}

export function normalizeSampleActivity(activity: Activity): Activity {
  if (!isSampleActivity(activity)) return activity;
  if (activity.provenance === "demo" && activity.disposition === "excluded" && activity.verified === false) {
    return activity;
  }
  return {
    ...activity,
    provenance: "demo",
    disposition: "excluded",
    verified: false,
    dispositionReason: activity.dispositionReason ?? "Sample calibration does not count.",
  };
}

export function dispositionOf(activity: Activity): ActivityDisposition {
  return activity.disposition ?? "counted";
}

/** Verified means a GPS session the tracker recorded, not a file or a sample. */
export function isVerifiedActivity(activity: Activity): boolean {
  if (provenanceOf(activity) !== "recorded") return false;
  if (!sportById(activity.sport).gps) return false;
  return activity.verified;
}

export function countsOnTrack(
  activity: Activity,
  track: "open" | "verified",
): boolean {
  if (isSampleActivity(activity)) return false;
  if (dispositionOf(activity) !== "counted") return false;
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
  const leftRank = PRECEDENCE[provenanceOf(left)];
  const rightRank = PRECEDENCE[provenanceOf(right)];
  if (leftRank !== rightRank) return leftRank > rightRank ? left : right;
  return left.startedAt <= right.startedAt ? left : right;
}

/**
 * Keep one counted row per workout. A weaker copy stays visible as excluded
 * so a second provider does not add the kilometers twice.
 */
export function mergeActivities(
  existing: Activity[],
  incoming: Activity[],
): Activity[] {
  const next = existing.map((activity) => ({ ...activity }));
  for (const raw of incoming) {
    const activity = { ...raw };
    const twinIndex = next.findIndex(
      (item) =>
        item.id === activity.id ||
        (dispositionOf(item) !== "excluded" && sameWorkout(item, activity)),
    );
    if (twinIndex < 0) {
      next.push(activity);
      continue;
    }
    const twin = next[twinIndex]!;
    if (twin.id === activity.id) {
      next[twinIndex] = {
        ...activity,
        disposition: dispositionOf(twin),
        dispositionReason: twin.dispositionReason,
      };
      continue;
    }
    const winner = prefer(twin, activity);
    const loser = winner.id === activity.id ? twin : activity;
    next[twinIndex] = {
      ...winner,
      disposition: dispositionOf(winner) === "pending" ? "pending" : "counted",
    };
    const excluded: Activity = {
      ...loser,
      disposition: "excluded",
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

/** Daily distance (km), moving pace (min/km), and rating after each settled week. */
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
    const day = activity.startedAt.slice(0, 10);
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
