import { activityFromSample, type ActivitySample, type ReadinessSample } from "@fitness-battle/shared";
import { useRef } from "react";
import { requestApi } from "./api";
import { useAuth } from "./auth";
import { useCompeteStore } from "./compete-store";
import {
  createAppleHealthDeps,
  createHealthConnectDeps,
  syncAppleHealth,
  syncHealthConnect,
} from "./device-health";
import { mobileEnv } from "./env";
import { playCue } from "./haptics";
import { providersForDevice } from "./platform-providers";

const syncFlights = new WeakMap<ReturnType<typeof useCompeteStore>["dispatch"], {
  account: string;
  task: Promise<void>;
}>();

function useActivitySync() {
  const { state, canWrite, debugActive, dispatch, refresh, beginSyncReviewBatch, endSyncReviewBatch } = useCompeteStore();
  const { user, accessToken, offlineMode } = useAuth();
  const account = debugActive ? undefined : user?.id;
  const owner = useRef(account);
  owner.current = account;

  return async function syncActivities(): Promise<void> {
    if (!account || owner.current !== account || !state || !canWrite) return;
    const id = account;
    const existing = syncFlights.get(dispatch);
    if (existing?.account === id) return existing.task;

    const supported = new Set(providersForDevice().map((provider) => provider.id));
    const links = state.links.filter((link) => link.linked && supported.has(link.provider));
    if (!links.length) return;

    const task = (async () => {
      beginSyncReviewBatch?.(id);
      let synced = false;
      try {
        for (const link of links) {
          if (owner.current !== id) return;
          try {
            if (
              link.provider === "apple_health" ||
              link.provider === "google_health"
            ) {
              const auth = {
                localOnly: offlineMode,
                lastSyncAt:
                  state.activities
                    .filter((a) => a.source === link.provider)
                    .map((a) => a.startedAt)
                    .sort()
                    .at(-1) ?? null,
                getAccessToken: async () => ({
                  token: accessToken ?? undefined,
                  userId: id,
                }),
              };
              const result =
                link.provider === "apple_health"
                  ? await syncAppleHealth(createAppleHealthDeps(auth))
                  : await syncHealthConnect(createHealthConnectDeps(auth));
              if (owner.current !== id) return;
              if (!result.ok) continue;
              if (result.activities?.length) {
                dispatch({
                  type: "apply-sync",
                  accountId: id,
                  provider: link.provider,
                  activities: result.activities.flatMap((sample) => {
                    const a = activityFromSample(sample, "recorded");
                    return a ? [a] : [];
                  }),
                  linkStatus: "connected",
                });
              } else await refresh();
              if (owner.current !== id) return;
              synced = true;
            } else if (!offlineMode) {
              const body = await requestApi<{
                activities?: ActivitySample[];
                readiness?: ReadinessSample[];
                usedMock?: boolean;
              }>(mobileEnv.apiUrl, accessToken, "/api/fitness/sync", {
                allowUnpersisted: true,
                body: { provider: link.provider },
              });
              if (owner.current !== id) return;
              dispatch({
                type: "apply-sync",
                accountId: id,
                provider: link.provider,
                readiness: (body.readiness ?? []).flatMap((sample) =>
                  sample.provider === link.provider
                    ? [
                        {
                          id: sample.id,
                          provider: link.provider,
                          day: sample.day,
                          score: sample.score,
                        },
                      ]
                    : [],
                ),
                activities: (body.activities ?? []).flatMap((sample) => {
                  const activity = activityFromSample(
                    sample,
                    body.usedMock ? "demo" : "recorded",
                  );
                  return activity ? [activity] : [];
                }),
                linkStatus: body.usedMock ? "stub" : "connected",
              });
              if (!body.usedMock) synced = true;
            }
          } catch {
            // Continue syncing the other connected trackers.
          }
        }
        if (!synced && owner.current === id) void playCue("error");
      } finally {
        endSyncReviewBatch?.(id, true);
      }
    })();
    syncFlights.set(dispatch, { account: id, task });
    try {
      return await task;
    } finally {
      if (syncFlights.get(dispatch)?.task === task) syncFlights.delete(dispatch);
    }
  };
}

export function usePullRefresh() {
  const { refresh, hasPendingSyncReview } = useCompeteStore();
  const syncActivities = useActivitySync();

  return async () => {
    if (hasPendingSyncReview) {
      // The background read already staged the receipt. Revalidate stale standings.
      await refresh({ ifStale: true });
      return;
    }
    // The account refresh can merge field snapshots before a sync receipt gates it.
    await refresh();
    await syncActivities();
  };
}
