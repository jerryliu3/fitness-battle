import { createHash, timingSafeEqual } from "node:crypto";
import { mapGarminActivity, type ActivitySample } from "@fitness-battle/shared";
import { createProviderStore, persistSyncedActivities, serviceDb, userIdForAthlete } from "./fitness-store";

export function secretMatches(actual: string | null, expected: string): boolean {
  if (!actual || !expected || expected.length < 32) return false;
  const a = Buffer.from(actual); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function enqueueGarminPush(raw: string): Promise<void> {
  const body: unknown = JSON.parse(raw);
  if (!body || typeof body !== "object" || !Array.isArray((body as { activities?: unknown }).activities)) {
    throw new Error("invalid_payload");
  }
  const items = (body as { activities: unknown[] }).activities;
  if (items.length > 500 || items.some(item => !item || typeof item !== "object" || typeof (item as { userId?: unknown }).userId !== "string")) {
    throw new Error("invalid_payload");
  }
  const db = serviceDb();
  if (!db) throw new Error("store_unavailable");
  const { error } = await db.rpc("enqueue_garmin_push", {
    p_hash: createHash("sha256").update(raw).digest("hex"), p_payload: { activities: items },
  });
  if (error) throw new Error("enqueue_failed");
}

export async function drainGarminPush(maxItems = 20): Promise<{ processed: number; failed: number }> {
  let processed = 0; let failed = 0;
  const db = serviceDb();
  if (!db) throw new Error("store_unavailable");
  for (let i = 0; i < maxItems; i++) {
    const { data, error } = await db.rpc("claim_garmin_push");
    if (error) throw new Error("claim_failed");
    const job = Array.isArray(data) ? data[0] : data;
    if (!job) return { processed, failed };
    let success = false;
    try {
      const grouped = new Map<string, ActivitySample[]>();
      for (const item of job.payload.activities) {
        const userId = await userIdForAthlete("garmin", item.userId);
        if (!userId) throw new Error("garmin_user_not_found");
        const sample = mapGarminActivity(item);
        if (sample) grouped.set(userId, [...(grouped.get(userId) ?? []), sample]);
      }
      for (const [userId, activities] of grouped) {
        if (!await persistSyncedActivities(userId, activities)) throw new Error("persist_failed");
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
