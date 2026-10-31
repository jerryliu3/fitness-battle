import { persistDailyHealth } from "@/lib/daily-health-store";
import { persistSleepNight } from "@/lib/garmin-record-store";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { CategorySlug } from "@fitness-battle/shared";
import { syncWindow } from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { getServerFitnessProvider, isOAuthProvider } from "@/lib/fitness";
import { createProviderStore, serviceDb, persistReadiness, persistSyncedActivities } from "@/lib/fitness-store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    provider?: string;
    categorySlug?: CategorySlug;
    since?: string;
    backfill?: boolean;
    automatic?: boolean;
  };
  const userId = await resolveRequestUserId(request, body.userId);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const providerId = body.provider && isOAuthProvider(body.provider) ? body.provider : "strava";
  const provider = getServerFitnessProvider(providerId);
  const connection = await provider.getConnection(userId);
  if (providerId === "garmin") return NextResponse.json({ provider: "garmin", delivery: "push", activities: [], readiness: [], persisted: true, usedMock: false, message: "Garmin sends new activities automatically after your device syncs with Garmin Connect." });
  if (connection.status !== "connected") return NextResponse.json({ error: "provider_not_connected" }, { status: 409 });
  const db = serviceDb();
  if (!db) return NextResponse.json({ error: "store_unavailable" }, { status: 503 });
  const lease = randomUUID();
  const { data: allowed, error: limitError } = await db.rpc("acquire_fitness_sync", { p_user: userId, p_provider: providerId, p_automatic: body.automatic === true, p_lease: lease });
  if (limitError) return NextResponse.json({ error: "sync_unavailable" }, { status: 503 });
  if (!allowed) return NextResponse.json({ error: "sync_cooldown", message: "Sync is already running or the hourly limit has been reached." }, { status: 429, headers: { "Retry-After": "3600" } });
  try {
  const window = syncWindow({
    lastSyncAt: body.backfill ? null : (body.since ?? connection.lastSyncAt ?? null),
    forceBackfill: Boolean(body.backfill),
  });

  const result = await provider.syncActivities(userId, {
    categorySlug: body.categorySlug,
    since: window.since,
  });

  let persisted = false;
  if (!result.usedMock) {
    try {
      const activitiesStored = await persistSyncedActivities(userId, result.activities);
      await persistDailyHealth(userId,result.dailyHealth??[]);
      for (const night of result.sleepNights ?? []) await persistSleepNight(userId, night);
      const readinessStored = await persistReadiness(userId, result.readiness ?? []);
      persisted = (result.activities.length === 0 || activitiesStored) && ((result.readiness ?? []).length === 0 || readinessStored);
    } catch {
      persisted = false;
    }
  }

  if (!persisted) {
    await createProviderStore(providerId)?.setConnection(connection);
    return NextResponse.json({ error: "sync_persistence_failed" }, { status: 503 });
  }
  return NextResponse.json({
    ...result,
    since: window.since,
    windowKind: window.kind,
    windowDays: window.days,
    persisted,
  });
  } catch (error) {
    await createProviderStore(providerId)?.setConnection(connection);
    if(error instanceof Error && error.message==="whoop_reconnect_required")return NextResponse.json({error:"provider_reconnect_required",message:"Reconnect WHOOP to approve sleep access."},{status:409});
    return NextResponse.json({ error: "provider_sync_failed" }, { status: 502 });
  } finally {
    await db.rpc("release_fitness_sync", { p_user: userId, p_provider: providerId, p_lease: lease });
  }
}
