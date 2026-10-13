import { NextResponse } from "next/server";
import type { CategorySlug } from "@fitness-battle/shared";
import { syncWindow } from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { getServerFitnessProvider, isOAuthProvider } from "@/lib/fitness";
import { persistReadiness, persistSyncedActivities } from "@/lib/fitness-store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    provider?: string;
    categorySlug?: CategorySlug;
    since?: string;
    backfill?: boolean;
  };
  const userId = await resolveRequestUserId(request, body.userId);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const providerId = body.provider && isOAuthProvider(body.provider) ? body.provider : "strava";
  const provider = getServerFitnessProvider(providerId);
  const connection = await provider.getConnection(userId);
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
      const readinessStored = await persistReadiness(userId, result.readiness ?? []);
      persisted = activitiesStored || readinessStored;
    } catch {
      persisted = false;
    }
  }

  return NextResponse.json({
    ...result,
    since: window.since,
    windowKind: window.kind,
    windowDays: window.days,
    persisted,
  });
}
