import { NextResponse } from "next/server";
import {
  normalizeNotificationPreferences,
  type NotificationCategoryId,
  type NotificationDeliveryPayload,
} from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { deliverNotificationToUser } from "@/lib/deliver-notification";
import { createRequestClient } from "@/lib/supabase/request";

const CATEGORIES = new Set<NotificationCategoryId>([
  "week_summary",
  "rival_moves",
  "lesson_reminder",
  "connection_alerts",
]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    userId?: unknown;
    payload?: Partial<NotificationDeliveryPayload> | null;
    prefs?: unknown;
  } | null;

  const userId = await resolveRequestUserId(
    request,
    typeof body?.userId === "string" ? body.userId : null,
  );
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const category = body?.payload?.category;
  if (!category || !CATEGORIES.has(category as NotificationCategoryId)) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }

  const payload: NotificationDeliveryPayload = {
    category: category as NotificationCategoryId,
    title:
      typeof body?.payload?.title === "string" && body.payload.title.trim()
        ? body.payload.title.trim().slice(0, 120)
        : "Overtaek",
    body:
      typeof body?.payload?.body === "string" && body.payload.body.trim()
        ? body.payload.body.trim().slice(0, 500)
        : "Test push from Overtaek.",
    path:
      typeof body?.payload?.path === "string" ? body.payload.path : undefined,
  };

  try {
    const supabase = await createRequestClient(request);
    const result = await deliverNotificationToUser(supabase, userId, payload, {
      prefs: body?.prefs
        ? normalizeNotificationPreferences(body.prefs)
        : undefined,
      requireLive: false,
    });

    if (!result.ok) {
      const status = result.reason === "blocked" ? 409 : 502;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "delivery_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
