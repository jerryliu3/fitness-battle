import {
  canDeliverNotification,
  isExpoPushToken,
  normalizeNotificationPreferences,
  type NotificationDeliveryPayload,
  type NotificationPreferences,
  type PushDeviceRow,
} from "@fitness-battle/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendExpoPush, type ExpoPushTicket } from "@/lib/expo-push";
import {
  loadRemoteNotificationState,
  recordDelivery,
} from "@/lib/notifications-store";

export type DeliverToUserResult =
  | {
      ok: true;
      mode: "expo" | "stub";
      payload: NotificationDeliveryPayload;
      deviceCount: number;
      tickets?: ExpoPushTicket[];
      outboxId: string;
      persisted: boolean;
      message?: string;
    }
  | {
      ok: false;
      reason: "blocked" | "no_live_devices" | "expo_failed";
      payload: NotificationDeliveryPayload;
      tickets?: ExpoPushTicket[];
      outboxId?: string;
      persisted?: boolean;
      message?: string;
    };

function liveTokens(
  devices: PushDeviceRow[],
  prefs: NotificationPreferences,
): string[] {
  const fromDevices = devices
    .filter((device) => !device.stub && isExpoPushToken(device.token))
    .map((device) => device.token);
  if (fromDevices.length > 0) return fromDevices;
  const token = prefs.registration?.token;
  if (
    prefs.registration &&
    !prefs.registration.stub &&
    token &&
    isExpoPushToken(token)
  ) {
    return [token];
  }
  return [];
}

/** Shared delivery used by /test, /send, and future product hooks. */
export async function deliverNotificationToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: NotificationDeliveryPayload,
  options?: {
    prefs?: NotificationPreferences;
    /** When true, refuse stub fallback (product sends). */
    requireLive?: boolean;
  },
): Promise<DeliverToUserResult> {
  const remote = await loadRemoteNotificationState(supabase, userId);
  const prefs = options?.prefs
    ? normalizeNotificationPreferences(options.prefs)
    : remote.prefs;

  if (!canDeliverNotification(prefs, payload.category)) {
    return { ok: false, reason: "blocked", payload };
  }

  const tokens = liveTokens(remote.devices, prefs);

  if (tokens.length > 0) {
    const send = await sendExpoPush(tokens, payload);
    const status =
      send.okCount > 0 && send.errorCount === 0
        ? "sent"
        : send.okCount > 0
          ? "queued"
          : "failed";
    const outbox = await recordDelivery(supabase, {
      userId,
      category: payload.category,
      title: payload.title,
      body: payload.body,
      path: payload.path,
      deviceCount: tokens.length,
      status,
    });
    if (send.okCount === 0) {
      return {
        ok: false,
        reason: "expo_failed",
        payload,
        tickets: send.tickets,
        outboxId: outbox.id,
        persisted: outbox.persisted,
        message: "Expo Push rejected every device token.",
      };
    }
    return {
      ok: true,
      mode: "expo",
      payload,
      deviceCount: tokens.length,
      tickets: send.tickets,
      outboxId: outbox.id,
      persisted: outbox.persisted,
    };
  }

  if (options?.requireLive) {
    return { ok: false, reason: "no_live_devices", payload };
  }

  const stubCount =
    remote.devices.filter((device) => Boolean(device.token)).length ||
    (prefs.registration?.token ? 1 : 0);
  const outbox = await recordDelivery(supabase, {
    userId,
    category: payload.category,
    title: payload.title,
    body: payload.body,
    path: payload.path,
    deviceCount: stubCount,
    status: "stubbed",
  });

  return {
    ok: true,
    mode: "stub",
    payload,
    deviceCount: stubCount,
    outboxId: outbox.id,
    persisted: outbox.persisted,
    message:
      "No live Expo push token on file. Register from a physical iOS/Android build to send via Expo Push.",
  };
}
