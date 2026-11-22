import { persistDailyHealth } from "@/lib/daily-health-store";
import { persistSleepNight } from "@/lib/garmin-record-store";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { CategorySlug } from "@fitness-battle/shared";
import { fitnessSyncWindow, finishFitnessHistory, readFitnessHistoryReview, stageFitnessHistoryReview } from "@/lib/fitness-history";
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
    historyLease?: string;
    automatic?: boolean;
    reviewHistory?: boolean;
  };
  const userId = await resolveRequestUserId(request, body.userId);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  if (body.backfill || body.since) return NextResponse.json({ error: "history_confirmation_required" }, { status: 400 });
  const providerId = body.provider && isOAuthProvider(body.provider) ? body.provider : "strava";
  const reviewHistory = body.reviewHistory === true;
  if (reviewHistory && (providerId === "garmin" || typeof body.historyLease !== "string" || body.automatic)) {
    return NextResponse.json({ error: "invalid_history_import" }, { status: 400 });
  }
  const provider = getServerFitnessProvider(providerId);
  const connection = await provider.getConnection(userId);
  if (providerId === "garmin") return NextResponse.json({ provider: "garmin", delivery: "push", activities: [], readiness: [], persisted: true, usedMock: false, message: "Garmin sends new activities automatically after your device syncs with Garmin Connect." });
  if (connection.status !== "connected") return NextResponse.json({ error: "provider_not_connected" }, { status: 409 });
  const db = serviceDb();
  if (!db) return NextResponse.json({ error: "store_unavailable" }, { status: 503 });
  const lease = randomUUID();
  const { data: allowed, error: limitError } = await db.rpc("acquire_fitness_sync", { p_user: userId, p_provider: providerId, p_automatic: body.automatic === true, p_lease: lease });
  if (limitError?.code === "PT429") {
    const retryAfter = Number(limitError.details);
    const minutes = Math.ceil(retryAfter / 60);
    const retry = minutes > 0
      ? `Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`
      : "Try again later.";
    return NextResponse.json({
      error: "sync_manual_limit",
      message: `You’ve reached 10 syncs in the past hour. ${retry}`,
    }, { status: 429, ...(minutes > 0 ? { headers: { "Retry-After": String(retryAfter) } } : {}) });
  }
  if (limitError) return NextResponse.json({ error: "sync_unavailable" }, { status: 503 });
  if (!allowed) return NextResponse.json({ error: "sync_cooldown", message: "A sync is already running or a recent sync is still on cooldown." }, { status: 429 });
  let staged = false;
  try {
    const window = await fitnessSyncWindow(userId, providerId, body.historyLease);

    const result = await provider.syncActivities(userId, {
      categorySlug: body.categorySlug,
      since: window.since,
      ...(reviewHistory ? { advanceCursor: false } : {}),
    });

    if (reviewHistory) {
      if (result.usedMock) return NextResponse.json({ error: "provider_sync_failed" }, { status: 502 });
      const { activities, readiness, dailyHealth, sleepNights } = result;
      staged = await stageFitnessHistoryReview(userId, providerId, body.historyLease!, {
        activities, readiness, dailyHealth, sleepNights,
      });
      return NextResponse.json({ activities: result.activities });
    }

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
    if (body.historyLease) await finishFitnessHistory(userId, body.historyLease, true);
    return NextResponse.json({
      ...result,
      historyImported: Boolean(body.historyLease),
      since: window.since,
      persisted,
    });
  } catch (error) {
    if (!reviewHistory) await createProviderStore(providerId)?.setConnection(connection);
    if(error instanceof Error && error.message==="whoop_reconnect_required")return NextResponse.json({error:"provider_reconnect_required",message:"Reconnect WHOOP to approve sleep access."},{status:409});
    return NextResponse.json({ error: "provider_sync_failed" }, { status: 502 });
  } finally {
    if (body.historyLease && !staged) await finishFitnessHistory(userId, body.historyLease, false).catch(() => {});
    await db.rpc("release_fitness_sync", { p_user: userId, p_provider: providerId, p_lease: lease });
  }
}

export async function PATCH(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.historyLease !== "string" ||
      !Array.isArray(body.selected) || !body.selected.length ||
      !body.selected.every((id: unknown) => typeof id === "string")) {
    return NextResponse.json({ error: "invalid_history_selection" }, { status: 400 });
  }

  const db = serviceDb();
  if (!db) return NextResponse.json({ error: "store_unavailable" }, { status: 503 });
  try {
    const samples = await readFitnessHistoryReview(userId, body.historyLease);
    if (!samples) {
      return NextResponse.json({ error: "history_review_expired", message: "This review has expired. Start the history import again." }, { status: 409 });
    }
    const selected = new Set<string>(body.selected);
    const activities = samples.activities.filter(activity => selected.has(activity.id));
    if (activities.length !== selected.size) {
      return NextResponse.json({ error: "invalid_history_selection" }, { status: 400 });
    }
    if (await persistSyncedActivities(userId, activities, "recorded", body.historyLease)) {
      // The workout transaction already succeeded. Auxiliary metrics use the
      // same idempotent stores as ordinary sync.
      await Promise.allSettled([
        persistDailyHealth(userId, samples.dailyHealth ?? []),
        persistReadiness(userId, samples.readiness ?? []),
        ...(samples.sleepNights ?? []).map(night => persistSleepNight(userId, night)),
      ]);
      return NextResponse.json({ persisted: true });
    }
    return NextResponse.json({ error: "history_review_expired", message: "This review has expired. Start the history import again." }, { status: 409 });
  } catch {
    return NextResponse.json({ error: "sync_persistence_failed", message: "Could not save your activities. Please try again." }, { status: 503 });
  }
}
