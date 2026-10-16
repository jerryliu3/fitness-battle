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

const RATE_LIMIT_WINDOW_MS = 10_000;
const MAX_REQUESTS_PER_WINDOW = 5;
const userSendTimestamps = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = (userSendTimestamps.get(userId) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    userSendTimestamps.set(userId, timestamps);
    return false;
  }
  timestamps.push(now);
  userSendTimestamps.set(userId, timestamps);
  return true;
}

/**
 * Product / client-triggered push for the signed-in user.
 * Requires a live Expo device unless the account is demo (then stub outbox).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    userId?: unknown;
    payload?: Partial<NotificationDeliveryPayload> | null;
    prefs?: unknown;
    /** Demo clients may allow stub outbox rows. */
    allowStub?: unknown;
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

  // Count only well-formed sends so bad clients cannot burn the window.
  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const payload: NotificationDeliveryPayload = {
    category: category as NotificationCategoryId,
    title: body.payload.title.trim().slice(0, 120),
    body: body.payload.body.trim().slice(0, 500),
    path:
      typeof body.payload.path === "string" ? body.payload.path : undefined,
  };

  try {
    const supabase = await createRequestClient(request);
    const allowStub = body?.allowStub === true;
    const result = await deliverNotificationToUser(supabase, userId, payload, {
      prefs: body?.prefs
        ? normalizeNotificationPreferences(body.prefs)
        : undefined,
      requireLive: !allowStub,
    });

    if (!result.ok) {
      const status =
        result.reason === "blocked"
          ? 409
          : result.reason === "no_live_devices"
            ? 404
            : 502;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "delivery_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
