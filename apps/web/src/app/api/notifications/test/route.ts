import { NextResponse } from "next/server";
import {
  canDeliverNotification,
  normalizeNotificationPreferences,
  type NotificationCategoryId,
  type NotificationDeliveryPayload,
} from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import {
  loadRemoteNotificationState,
  recordStubDelivery,
} from "@/lib/notifications-store";

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
        : "Test push — delivery is stubbed.",
    path:
      typeof body?.payload?.path === "string" ? body.payload.path : undefined,
  };

  try {
    const remote = await loadRemoteNotificationState(userId);
    // Prefer explicit client prefs ( freshest toggle state ) when provided.
    const prefs = body?.prefs
      ? normalizeNotificationPreferences(body.prefs)
      : remote.prefs;

    if (!canDeliverNotification(prefs, payload.category)) {
      return NextResponse.json(
        { ok: false, reason: "blocked", persisted: remote.persisted },
        { status: 409 },
      );
    }

    const activeDevices = remote.devices.filter((device) => Boolean(device.token));
    const outbox = await recordStubDelivery({
      userId,
      category: payload.category,
      title: payload.title,
      body: payload.body,
      path: payload.path,
      deviceCount: activeDevices.length,
    });

    return NextResponse.json({
      ok: true,
      mode: "stub",
      payload,
      deviceCount: activeDevices.length,
      outboxId: outbox.id,
      persisted: outbox.persisted,
    });
  } catch {
    return NextResponse.json({ error: "delivery_failed" }, { status: 500 });
  }
}
