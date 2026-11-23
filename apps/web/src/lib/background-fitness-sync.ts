import type { FitnessProviderId } from "@fitness-battle/shared";
import { persistDailyHealth } from "@/lib/daily-health-store";
import {
  maybeSendMorningRecoveryPush,
  runEveningDailySummaries,
} from "@/lib/daily-digest-push";
import { getServerFitnessProvider } from "@/lib/fitness";
import { fitnessSyncWindow } from "@/lib/fitness-history";
import {
  createProviderStore,
  persistReadiness,
  persistSyncedActivities,
  serviceDb,
} from "@/lib/fitness-store";
import { persistSleepNight } from "@/lib/garmin-record-store";

export const BACKGROUND_PULL_PROVIDERS = ["strava", "oura", "whoop"] as const;
export type BackgroundPullProvider = (typeof BACKGROUND_PULL_PROVIDERS)[number];

export interface SyncUserProviderOutcome {
  ok: boolean;
  activities: number;
  readiness: number;
  sleepNights: number;
  dailyHealth: number;
  skipped?: boolean;
  error?: string;
}

/**
 * Pull and persist workouts, daily health, sleep, and readiness for one user+provider.
 * Used by the hourly background cron and Strava webhook.
 */
export async function syncConnectedProviderForUser(
  userId: string,
  providerId: BackgroundPullProvider,
): Promise<SyncUserProviderOutcome> {
  const provider = getServerFitnessProvider(providerId);
  const connection = await provider.getConnection(userId);
  if (connection.status !== "connected") {
    return {
      ok: true,
      activities: 0,
      readiness: 0,
      sleepNights: 0,
      dailyHealth: 0,
      skipped: true,
    };
  }

  try {
    const window = await fitnessSyncWindow(userId, providerId);
    const result = await provider.syncActivities(userId, { since: window.since });
    if (result.usedMock) {
      return {
        ok: false,
        activities: 0,
        readiness: 0,
        sleepNights: 0,
        dailyHealth: 0,
        error: "provider_mock_fallback",
      };
    }

    await persistSyncedActivities(userId, result.activities);
    await persistDailyHealth(userId, result.dailyHealth ?? []);
    for (const night of result.sleepNights ?? []) {
      await persistSleepNight(userId, night);
    }
    await persistReadiness(userId, result.readiness ?? []);

    const db = serviceDb();
    if (
      db &&
      ((result.sleepNights?.length ?? 0) > 0 || (result.readiness?.length ?? 0) > 0)
    ) {
      await maybeSendMorningRecoveryPush(db, userId);
    }

    return {
      ok: true,
      activities: result.activities.length,
      readiness: result.readiness?.length ?? 0,
      sleepNights: result.sleepNights?.length ?? 0,
      dailyHealth: result.dailyHealth?.length ?? 0,
    };
  } catch (error) {
    await createProviderStore(providerId)
      ?.setConnection(connection)
      .catch(() => {});
    return {
      ok: false,
      activities: 0,
      readiness: 0,
      sleepNights: 0,
      dailyHealth: 0,
      error: error instanceof Error ? error.message : "sync_failed",
    };
  }
}

export interface BackgroundSyncSummary {
  attempted: number;
  synced: number;
  failed: number;
  activities: number;
}

/** Sync all connected Strava, Oura, and WHOOP accounts within a time budget. */
export async function runBackgroundProviderSync(
  budgetMs = 45_000,
): Promise<BackgroundSyncSummary> {
  const db = serviceDb();
  if (!db) return { attempted: 0, synced: 0, failed: 0, activities: 0 };

  const { data: rows, error } = await db
    .from("fitness_connections")
    .select("user_id, provider, last_sync_at")
    .eq("status", "connected")
    .in("provider", [...BACKGROUND_PULL_PROVIDERS])
    .order("last_sync_at", { ascending: true, nullsFirst: true });
  if (error || !rows) {
    throw new Error("connections_unavailable");
  }

  const deadline = Date.now() + budgetMs;
  const summary: BackgroundSyncSummary = {
    attempted: 0,
    synced: 0,
    failed: 0,
    activities: 0,
  };

  for (const row of rows) {
    if (Date.now() >= deadline) break;
    const providerId = row.provider as FitnessProviderId;
    if (
      providerId !== "strava" &&
      providerId !== "oura" &&
      providerId !== "whoop"
    ) {
      continue;
    }
    summary.attempted += 1;
    const outcome = await syncConnectedProviderForUser(
      String(row.user_id),
      providerId,
    );
    if (outcome.ok) {
      summary.synced += 1;
      summary.activities += outcome.activities;
    } else {
      summary.failed += 1;
    }
  }

  await runEveningDailySummaries(db);

  return summary;
}
