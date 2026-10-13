import { NextResponse } from "next/server";
import { isGarminCallbackUrl } from "@fitness-battle/shared";
import { getServerFitnessProvider } from "@/lib/fitness";
import { persistSyncedActivities, userIdForAthlete } from "@/lib/fitness-store";

interface GarminPingItem {
  userId?: string;
  callbackURL?: string;
}

/**
 * Garmin Health API ping/push notification.
 * Garmin calls this after a user uploads. We only follow callback URLs on
 * apis.garmin.com, then store the activity summaries.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    activities?: GarminPingItem[];
  };
  const items = body.activities ?? [];
  let stored = 0;
  for (const item of items) {
    if (!item.userId || !item.callbackURL || !isGarminCallbackUrl(item.callbackURL)) continue;
    const userId = await userIdForAthlete("garmin", item.userId);
    if (!userId) continue;
    const provider = getServerFitnessProvider("garmin");
    const activities = await provider.pullCallback(userId, item.callbackURL);
    if (await persistSyncedActivities(userId, activities)) stored += activities.length;
  }
  return NextResponse.json({ ok: true, stored });
}
