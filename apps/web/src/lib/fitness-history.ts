import { randomUUID } from "node:crypto";
import { syncWindow, trackerSyncWindow, type FitnessHistoryStatus, type FitnessHistoryTicket, type FitnessProviderId, type SyncResult } from "@fitness-battle/shared";
import { createProviderStore, serviceDb } from "./fitness-store";

export async function fitnessHistoryStatus(userId: string): Promise<FitnessHistoryStatus> {
  const db = serviceDb();
  if (!db) throw new Error("store_unavailable");
  const { data, error } = await db.from("fitness_history_imports").select("completed_at, provider, days").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("history_unavailable");
  return { completed: Boolean(data?.completed_at), provider: data?.provider ?? null, days: data?.days ?? null };
}

export async function beginFitnessHistory(userId: string, provider: FitnessProviderId, days: number): Promise<FitnessHistoryTicket> {
  const db = serviceDb();
  if (!db) throw new Error("store_unavailable");
  const lease = randomUUID();
  const { data, error } = await db.rpc("claim_fitness_history", { p_user: userId, p_provider: provider, p_days: days, p_lease: lease });
  if (error) throw new Error("history_unavailable");
  if (!data) throw new Error("history_locked");
  return { lease, ...await fitnessSyncWindow(userId, provider, lease) };
}

export async function fitnessSyncWindow(userId: string, provider: FitnessProviderId, lease?: string, options: { incremental?: boolean } = {}): Promise<{ since: string; until: string }> {
  if (!lease) {
    const connection = await createProviderStore(provider)?.getConnection(userId);
    // Uploads can overlap another sync. Validate against connection time, not
    // a cursor that may have advanced since the device started reading.
    return trackerSyncWindow(options.incremental === false
      ? { connectedAt: connection?.connectedAt ?? connection?.lastSyncAt }
      : connection ?? {});
  }
  const db = serviceDb();
  if (!db) throw new Error("store_unavailable");
  const { data, error } = await db.from("fitness_history_imports").select("provider, days, started_at, completed_at, lease, lease_until").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("history_unavailable");
  if (!data || data.provider !== provider || data.completed_at || data.lease !== lease || Date.parse(data.lease_until) <= Date.now()) throw new Error("history_locked");
  return syncWindow({ now: new Date(data.started_at), backfillDays: data.days });
}

export async function finishFitnessHistory(userId: string, lease: string, success: boolean): Promise<void> {
  const db = serviceDb();
  if (!db) throw new Error("store_unavailable");
  const { data, error } = await db.rpc("finish_fitness_history", { p_user: userId, p_lease: lease, p_success: success });
  if (error || success && !data) throw new Error("history_unavailable");
}

type HistoryReviewSamples = Pick<SyncResult, "activities" | "readiness" | "dailyHealth" | "sleepNights">;

export async function stageFitnessHistoryReview(
  userId: string, provider: FitnessProviderId, lease: string, samples: HistoryReviewSamples,
): Promise<boolean> {
  if (!samples.activities.length) return false;
  const db = serviceDb();
  if (!db) throw new Error("store_unavailable");
  const { data, error } = await db.from("fitness_history_imports")
    .update({ review_samples: samples })
    .eq("user_id", userId).eq("provider", provider).eq("lease", lease)
    .gt("lease_until", new Date().toISOString())
    .select("user_id").maybeSingle();
  if (error || !data) throw new Error("history_unavailable");
  return true;
}

export async function readFitnessHistoryReview(userId: string, lease: string): Promise<HistoryReviewSamples | null> {
  const db = serviceDb();
  if (!db) throw new Error("store_unavailable");
  const { data, error } = await db.from("fitness_history_imports").select("review_samples")
    .eq("user_id", userId).eq("lease", lease)
    .gt("lease_until", new Date().toISOString()).maybeSingle();
  if (error) throw error;
  return data?.review_samples ?? null;
}
