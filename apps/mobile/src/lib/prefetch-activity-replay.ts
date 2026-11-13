import { requestApi } from "./api";
import { mobileEnv } from "./env";
import type { Activity } from "@fitness-battle/shared";

const inflight = new Set<string>();

/** Warm the replay endpoint so SessionStage route data is ready when the sheet opens. */
export function prefetchActivityReplay(
  activity: Activity | undefined,
  accessToken: string | null | undefined,
): void {
  if (!activity || activity.routeReplay || !accessToken || inflight.has(activity.id)) return;
  inflight.add(activity.id);
  void requestApi(
    mobileEnv.apiUrl,
    accessToken,
    `/api/fitness/replay?activityId=${encodeURIComponent(activity.id)}`,
  ).finally(() => {
    inflight.delete(activity.id);
  });
}
