import { randomUUID } from "node:crypto";
import { syncWindow, trackerSyncWindow, type FitnessHistoryStatus, type FitnessHistoryTicket, type FitnessProviderId } from "@fitness-battle/shared";
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

export async function fitnessSyncWindow(userId: string, provider: FitnessProviderId, lease?: string): Promise<{ since: string; until: string }> {
  if (!lease) {
    const connection = await createProviderStore(provider)?.getConnection(userId);
    return trackerSyncWindow(connection ?? {});
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
