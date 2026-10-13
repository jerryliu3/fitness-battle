import { NextResponse } from "next/server";
import type {
  ActivitySample,
  CategorySlug,
  FitnessProviderId,
  ReadinessSample,
} from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import {
  createProviderStore,
  persistReadiness,
  persistSyncedActivities,
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
  return {
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
  };
  const userId = await resolveRequestUserId(request, body.userId);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  if (!body.provider || !DEVICE_PROVIDERS.has(body.provider)) {
    return NextResponse.json({ error: "device_provider_required" }, { status: 400 });
  }
  const activities = (body.activities ?? [])
    .slice(0, 200)
    .map((item) => activityFromBody(body.provider!, item))
    .filter((item): item is ActivitySample => item != null);
  const readiness = (body.readiness ?? [])
    .slice(0, 200)
    .map((item) => readinessFromBody(body.provider!, item))
    .filter((item): item is ReadinessSample => item != null);

  let persisted = false;
  try {
    const storedActivities = await persistSyncedActivities(userId, activities);
    const storedReady = await persistReadiness(userId, readiness);
    persisted = storedActivities || storedReady;
    const store = createProviderStore(body.provider);
    if (store && (activities.length > 0 || readiness.length > 0)) {
      const newest = activities.map((item) => item.startedAt).sort().at(-1) ?? null;
      await store.setConnection({
        userId,
        provider: body.provider,
        connectedAt: new Date().toISOString(),
        status: "connected",
        lastSyncAt: new Date().toISOString(),
        lastActivityAt: newest,
      });
    }
  } catch {
    persisted = false;
  }

  return NextResponse.json({
    provider: body.provider,
    activities,
    readiness,
    persisted,
    usedMock: false,
  });
}
