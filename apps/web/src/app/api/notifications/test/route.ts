import { NextResponse } from "next/server";
import {
  canDeliverNotification,
  isExpoPushToken,
  normalizeNotificationPreferences,
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
    const remote = await loadRemoteNotificationState(userId);
    const prefs = body?.prefs
      ? normalizeNotificationPreferences(body.prefs)
      : remote.prefs;

    if (!canDeliverNotification(prefs, payload.category)) {
      return NextResponse.json(
        { ok: false, reason: "blocked", persisted: remote.persisted },
        { status: 409 },
      );
    }

    const liveTokens = remote.devices
      .filter((device) => !device.stub && isExpoPushToken(device.token))
      .map((device) => device.token);
    // Also accept a live token from the client prefs when remote has none yet.
    const clientToken = prefs.registration?.token;
    if (
      liveTokens.length === 0 &&
      prefs.registration &&
      !prefs.registration.stub &&
      clientToken &&
      isExpoPushToken(clientToken)
    ) {
      liveTokens.push(clientToken);
    }

    if (liveTokens.length > 0) {
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
        payload,
        deviceCount: liveTokens.length,
        tickets: send.tickets,
        outboxId: outbox.id,
        persisted: outbox.persisted,
      });
    }

    const stubDevices = remote.devices.filter((device) => Boolean(device.token));
    const outbox = await recordDelivery({
      userId,
      category: payload.category,
      title: payload.title,
      body: payload.body,
      path: payload.path,
      deviceCount: stubDevices.length || (prefs.registration?.token ? 1 : 0),
      status: "stubbed",
    });

    return NextResponse.json({
      ok: true,
      mode: "stub",
      payload,
      deviceCount: outbox.persisted ? stubDevices.length : 1,
      outboxId: outbox.id,
      persisted: outbox.persisted,
      message:
        "No live Expo push token on file. Register from a physical iOS/Android build to send via Expo Push.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "delivery_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
