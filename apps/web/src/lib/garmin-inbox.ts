import { createHash, timingSafeEqual } from "node:crypto";
import type { ActivitySample } from "@fitness-battle/shared";
import { createProviderStore, persistSyncedActivities, serviceDb, userIdForAthlete } from "./fitness-store";

import { garminActivity, garminSleep, parseGarminPush, type GarminFeed } from "./garmin-feeds";
import { fetchGarminFile, persistGarminSleep, storeGarminRecord } from "./garmin-record-store";

export function secretMatches(actual: string | null, expected: string): boolean {
  if (!actual || !expected || expected.length < 32) return false;
  const a = Buffer.from(actual); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function enqueueGarminPush(raw: string): Promise<void> {
  const body = parseGarminPush(raw);
  const db = serviceDb();
  if (!db) throw new Error("store_unavailable");
  const jobs = Object.entries(body).flatMap(([feed, items]) => items!.map(item => {
    const payload = { [feed]: [item] };
    return { hash: createHash("sha256").update(JSON.stringify(payload)).digest("hex"), payload };
  }));
  const { error } = await db.rpc("enqueue_garmin_batch", { p_items: jobs });
  if (error) throw new Error("enqueue_failed");
}

export async function drainGarminPush(maxItems = 20): Promise<{ processed: number; failed: number }> {
  let processed = 0; let failed = 0;
  const db = serviceDb();
  if (!db) throw new Error("store_unavailable");
  const deadline = Date.now() + 40_000;
  for (let i = 0; i < maxItems && Date.now() < deadline; i++) {
    const { data, error } = await db.rpc("claim_garmin_push");
    if (error) throw new Error("claim_failed");
    const job = Array.isArray(data) ? data[0] : data;
    if (!job) return { processed, failed };
    let success = false;
    try {
      const grouped = new Map<string, ActivitySample[]>();
      const touched = new Set<string>();
      for (const [key, items] of Object.entries(parseGarminPush(JSON.stringify(job.payload)))) {
        const feed = key as GarminFeed;
        for (const item of items!) {
          const userId = await userIdForAthlete("garmin", item.userId);
          if (feed === "deregistrations") {
            if (userId) await storeGarminRecord(userId, feed, item);
            const { error } = await db.rpc("revoke_garmin_link", { p_external_user_id: item.userId });
            if (error) throw new Error("garmin_revoke_failed");
            continue;
          }
          if (!userId) throw new Error("garmin_user_not_found");
          await storeGarminRecord(userId, feed, item);
          touched.add(userId);
          if (feed === "userPermissionsChange") {
            if (!Array.isArray(item.permissions) || item.permissions.some(value => typeof value !== "string") || typeof item.changeTimeInSeconds !== "number") throw new Error("invalid_permissions");
            const { error } = await db.rpc("apply_garmin_permissions", { p_user_id: userId, p_permissions: item.permissions, p_changed_at: item.changeTimeInSeconds });
            if (error) throw new Error("garmin_permissions_failed");
          }
          if (feed === "sleeps") {
            const night = garminSleep(item);
            if (night) await persistGarminSleep(userId, night);
          }
          const samples = feed === "activityFiles" ? await fetchGarminFile(userId, item) : [garminActivity(feed, item)].filter((sample): sample is ActivitySample => sample != null);
          if (samples.length) grouped.set(userId, [...(grouped.get(userId) ?? []), ...samples]);
        }
      }
      for (const [userId, incoming] of grouped) {
        const unique = new Map<string, ActivitySample>();
        for (const sample of incoming) {
          const supplied = Object.fromEntries(Object.entries(sample).filter(([, value]) => value != null));
          unique.set(sample.externalId, { ...unique.get(sample.externalId), ...supplied } as ActivitySample);
        }
        const activities = [...unique.values()];
        if (!await persistSyncedActivities(userId, activities)) throw new Error("persist_failed");
      }
      for (const userId of touched) {
        const activities = grouped.get(userId) ?? [];
        const store = createProviderStore("garmin");
        const connection = await store?.getConnection(userId);
        if (store && connection?.status === "connected") {
          const latest = [...activities.map(activity => activity.startedAt), ...(connection.lastActivityAt ? [connection.lastActivityAt] : [])].sort().at(-1) ?? null;
          await store.setConnection({ ...connection, lastSyncAt: new Date().toISOString(), lastActivityAt: latest });
        }
      }
      success = true;
    } catch {
      failed++;
    } finally {
      const { error: finishError } = await db.rpc("finish_garmin_push", { p_id: job.id, p_lease: job.lease_id, p_success: success });
      if (finishError) throw new Error("finish_failed");
    }
    processed++;
  }
  return { processed, failed };
}
