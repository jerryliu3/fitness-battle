import { dayKey, decodePolyline, normalizeRouteReplay } from "@fitness-battle/shared";
import { persistDailyHealth } from "@/lib/daily-health-store";
import { markRecoveryCheckedIn } from "@/lib/daily-digest-push";
import { persistSleepNight } from "@/lib/garmin-record-store";
import type { SyncResult, SleepNight } from "@fitness-battle/shared";
import { NextResponse } from "next/server";
import type {
  ActivitySample,
  CategorySlug,
  FitnessProviderId,
  ReadinessSample,
} from "@fitness-battle/shared";
import { fitnessSyncWindow, finishFitnessHistory, stageFitnessHistoryReview } from "@/lib/fitness-history";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import {
  createProviderStore,
  persistReadiness,
  persistSyncedActivities,
  serviceDb,
} from "@/lib/fitness-store";

const DEVICE_PROVIDERS = new Set<FitnessProviderId>(["apple_health", "google_health"]);
const SPORTS = new Set<CategorySlug>(["running", "cycling", "walking", "strength"]);

function activityFromBody(
  provider: FitnessProviderId,
  raw: Partial<ActivitySample>,
): ActivitySample | null {
  if (!raw.externalId || !raw.startedAt || !raw.categorySlug) return null;
  if (!SPORTS.has(raw.categorySlug)) return null;
  const started = new Date(raw.startedAt);
  if (Number.isNaN(started.getTime())) return null;
  const metric = Number(raw.metricValue);
  if (!Number.isFinite(metric) || metric < 0) return null;
  const safeLine=(value:unknown)=>{if(typeof value!=="string"||value.length>500000)return null;try{const points=decodePolyline(value);return points.length>=2&&points.every(([lon,lat])=>Number.isFinite(lon)&&Number.isFinite(lat)&&Math.abs(lon)<=180&&Math.abs(lat)<=90)?value:null;}catch{return null;}};
  return {
    summaryPolyline:safeLine(raw.summaryPolyline),detailedPolyline:safeLine(raw.detailedPolyline),routeReplay:normalizeRouteReplay(raw.routeReplay),
    id: `${provider}-${raw.externalId}`,
    provider,
    externalId: String(raw.externalId).slice(0, 200),
    categorySlug: raw.categorySlug,
    startedAt: started.toISOString(),
    metricValue: metric,
    movingSec: raw.movingSec != null ? Number(raw.movingSec) : undefined,
    avgHr: raw.avgHr ?? null,
    rawName: String(raw.rawName ?? raw.categorySlug).slice(0, 200),
  };
}

function readinessFromBody(
  provider: FitnessProviderId,
  raw: Partial<ReadinessSample>,
): ReadinessSample | null {
  if (!raw.day || raw.score == null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.day)) return null;
  const score = Number(raw.score);
  if (!Number.isFinite(score) || score < 0 || score > 100) return null;
  const externalId = String(raw.externalId ?? raw.day).slice(0, 200);
  return {
    id: `${provider}-ready-${externalId}`,
    provider,
    externalId,
    day: raw.day,
    score,
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    provider?: FitnessProviderId;
    activities?: Partial<ActivitySample>[];
    readiness?: Partial<ReadinessSample>[];
    dailyHealth?: SyncResult["dailyHealth"];
    sleepNights?: SleepNight[];
    historyLease?: string;
    reviewHistory?: boolean;
  };
  const userId = await resolveRequestUserId(request, body.userId);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  if (!body.provider || !DEVICE_PROVIDERS.has(body.provider)) {
    return NextResponse.json({ error: "device_provider_required" }, { status: 400 });
  }
  const provider = body.provider;
  if (body.reviewHistory && typeof body.historyLease !== "string") {
    return NextResponse.json({ error: "invalid_history_import" }, { status: 400 });
  }
  let window: { since: string; until: string };
  try { window = await fitnessSyncWindow(userId, provider, body.historyLease, { incremental: false }); }
  catch { return NextResponse.json({ error: "history_unavailable" }, { status: 409 }); }
  if ((body.activities?.length ?? 0) > 2000) return NextResponse.json({ error: "too_many_activities" }, { status: 400 });
  const inWindow = (at: string) => at >= window.since && at <= window.until;
  const inDayWindow = (day: string) => day >= dayKey(new Date(window.since)) && day <= dayKey(new Date(window.until));
  const activities = (body.activities ?? [])
    .map((item) => activityFromBody(provider, item))
    .filter((item): item is ActivitySample => item != null && inWindow(item.startedAt));
  const readiness = (body.readiness ?? [])
    .slice(0, 200)
    .map((item) => readinessFromBody(provider, item))
    .filter((item): item is ReadinessSample => item != null && inDayWindow(item.day));

  let persisted = false;
  let staged = false;
  try {
    const dailyHealth = Array.isArray(body.dailyHealth)
      ? body.dailyHealth.slice(0, 200).filter(r => inDayWindow(r.day)).map((r) => ({ ...r, provider }))
      : [];
    const sleeps = (Array.isArray(body.sleepNights) ? body.sleepNights : [])
      .slice(0, 200)
      .filter(
        (r) =>
          typeof r.id === "string" &&
          r.id.length < 200 &&
          /^\d{4}-\d{2}-\d{2}$/.test(r.day) &&
          inDayWindow(r.day) &&
          Number.isFinite(r.durationMin) &&
          r.durationMin > 0 &&
          r.durationMin <= 1440 &&
          Number.isFinite(r.score) &&
          r.score >= 0 &&
          r.score <= 100,
      );
    const sleepNights = sleeps.map(night => {
      const sleepId =
        night.id.startsWith(provider) || night.id.startsWith("apple-health-") || night.id.startsWith("health-connect-")
          ? night.id
          : `${provider}-sleep-${night.id}`;
      return {
        ...night,
        id: sleepId,
        source: provider as "apple_health" | "google_health",
        verified: true,
      };
    });
    if (body.reviewHistory) {
      staged = await stageFitnessHistoryReview(userId, provider, body.historyLease!, {
        activities, readiness, dailyHealth, sleepNights,
      });
      return NextResponse.json({ activities, reviewHistory: true });
    }
    await persistDailyHealth(userId, dailyHealth);
    for (const night of sleepNights) await persistSleepNight(userId, night);
    const storedActivities = await persistSyncedActivities(userId, activities);
    const storedReady = await persistReadiness(userId, readiness);
    if (sleepNights.length > 0 || readiness.length > 0) {
      const db = serviceDb();
      if (db) void markRecoveryCheckedIn(db, userId);
    }
    persisted = (activities.length === 0 || storedActivities) && (readiness.length === 0 || storedReady);
    const store = createProviderStore(provider);
    if (!store || !persisted) throw new Error("store_unavailable");
    {
      const connection = await store.getConnection(userId);
      const newest = activities.map((item) => item.startedAt).sort().at(-1) ?? null;
      await store.setConnection({
        userId,
        provider,
        connectedAt: connection?.connectedAt ?? new Date().toISOString(),
        status: "connected",
        lastSyncAt: new Date().toISOString(),
        lastActivityAt: newest ?? connection?.lastActivityAt ?? null,
      });
    }
    if (body.historyLease) await finishFitnessHistory(userId, body.historyLease, true);
  } catch {
    persisted = false;
  } finally {
    if (body.historyLease && !staged) await finishFitnessHistory(userId, body.historyLease, false).catch(() => {});
  }
  if (!persisted) return NextResponse.json({ error: "sync_persistence_failed", persisted: false }, { status: 503 });

  return NextResponse.json({
    provider,
    activities,
    readiness,
    persisted,
    usedMock: false,
    historyImported: Boolean(body.historyLease),
  });
}
