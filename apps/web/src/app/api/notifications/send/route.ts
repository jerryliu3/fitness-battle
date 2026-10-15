import { NextResponse } from "next/server";
import {
  canDeliverNotification,
  isExpoPushToken,
  type NotificationCategoryId,
  type NotificationDeliveryPayload,
} from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { sendExpoPush } from "@/lib/expo-push";
import {
  loadRemoteNotificationState,
  recordDelivery,
} from "@/lib/notifications-store";

const CATEGORIES = new Set<NotificationCategoryId>([
  "week_summary",
  "rival_moves",
  "lesson_reminder",
  "connection_alerts",
]);

/**
 * Server-initiated push to the signed-in user's live Expo devices.
 * Use from product events later; honors category preferences.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    userId?: unknown;
    payload?: Partial<NotificationDeliveryPayload> | null;
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
  if (
    typeof body?.payload?.title !== "string" ||
    !body.payload.title.trim() ||
    typeof body?.payload?.body !== "string" ||
    !body.payload.body.trim()
  ) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const payload: NotificationDeliveryPayload = {
    category: category as NotificationCategoryId,
    title: body.payload.title.trim().slice(0, 120),
    body: body.payload.body.trim().slice(0, 500),
    path:
      typeof body.payload.path === "string" ? body.payload.path : undefined,
  };

  try {
    const remote = await loadRemoteNotificationState(userId);
    if (!canDeliverNotification(remote.prefs, payload.category)) {
      return NextResponse.json({ ok: false, reason: "blocked" }, { status: 409 });
    }

    const liveTokens = remote.devices
      .filter((device) => !device.stub && isExpoPushToken(device.token))
      .map((device) => device.token);

    if (liveTokens.length === 0) {
      return NextResponse.json(
        { ok: false, reason: "no_live_devices", persisted: remote.persisted },
        { status: 404 },
      );
    }

    const send = await sendExpoPush(liveTokens, payload);
    const status =
      send.okCount > 0 && send.errorCount === 0
        ? "sent"
        : send.okCount > 0
          ? "queued"
          : "failed";
    const outbox = await recordDelivery({
      userId,
      category: payload.category,
      title: payload.title,
      body: payload.body,
      path: payload.path,
      deviceCount: liveTokens.length,
      status,
    });

    return NextResponse.json({
      ok: send.okCount > 0,
      mode: "expo",
      deviceCount: liveTokens.length,
      tickets: send.tickets,
      outboxId: outbox.id,
      persisted: outbox.persisted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "delivery_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
