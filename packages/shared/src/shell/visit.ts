import { activityEffort, competeNow, countsOnTrack } from "../compete";
import { currentPeriodBounds } from "../period";
import type { CompeteState } from "../compete/sports";

/** Counted progress for one sport and period. Used to decide a return visit. */
export interface WeekVisit {
  version: 1;
  scope: string;
  effort: number;
  distanceM: number;
  movingSec: number;
  activityIds: string[];
}

export function weekVisit(state: CompeteState, now: Date = competeNow(state)): WeekVisit {
  const bounds = currentPeriodBounds(state.clock.kind, now);
  const activities = state.activities.filter((activity) => {
    if (activity.sport !== state.primary) return false;
    if (!countsOnTrack(activity, "open")) return false;
    const at = new Date(activity.startedAt);
    return at >= bounds.startsAt && at < bounds.endsAt && at <= now;
  });
  return {
    version: 1,
    scope: `${state.primary}:open:${bounds.startsAt.toISOString()}:${bounds.endsAt.toISOString()}`,
    effort: activities.reduce((sum, activity) => sum + activityEffort(activity), 0),
    distanceM: activities.reduce((sum, activity) => sum + activity.distanceM, 0),
    movingSec: activities.reduce((sum, activity) => sum + activity.movingSec, 0),
    activityIds: [...new Set(activities.map((activity) => activity.id))].sort(),
  };
}

export function visitGain(previous: WeekVisit | null, current: WeekVisit) {
  if (!previous || previous.scope !== current.scope) return null;
  const effort = current.effort - previous.effort;
  const distanceM = current.distanceM - previous.distanceM;
  const movingSec = current.movingSec - previous.movingSec;
  if (effort <= 0.001 || (distanceM <= 0.01 && movingSec <= 0.01)) return null;
  return {
    effort,
    distanceM: Math.max(0, distanceM),
    movingSec: Math.max(0, movingSec),
    newActivities: current.activityIds.filter((id) => !previous.activityIds.includes(id)).length,
  };
}

export function readWeekVisit(raw: string | null): WeekVisit | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as WeekVisit;
    if (
      value.version !== 1 ||
      typeof value.scope !== "string" ||
      ![value.effort, value.distanceM, value.movingSec].every(
        (item) => Number.isFinite(item) && item >= 0,
      ) ||
      !Array.isArray(value.activityIds) ||
      !value.activityIds.every((id) => typeof id === "string")
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function visitSeenKey(
  accountId: string,
  visit: WeekVisit,
  prefix = "fb-visit:seen",
) {
  return `${prefix}:${encodeURIComponent(accountId)}:${visit.scope}`;
}
