import { NextResponse } from "next/server";
import { syncWindow, type CategorySlug } from "@fitness-battle/shared";
import { resolveUserId } from "@/lib/auth/request-user";
import { getServerFitnessProvider } from "@/lib/fitness";
import { persistSyncedActivities } from "@/lib/fitness-store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    categorySlug?: CategorySlug;
    since?: string;
    backfill?: boolean;
  };
  const userId = await resolveUserId(body.userId);
  if (!userId) {
    return NextResponse.json(
      { error: "authentication_required" },
      { status: 401 },
    );
  }

  const provider = getServerFitnessProvider();
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
      persisted = await persistSyncedActivities(userId, result.activities);
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
