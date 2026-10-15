import {
  NOTIFICATION_STORAGE_KEY,
  createStubPushToken,
  normalizeNotificationPreferences,
  parseNotificationPreferences,
  prepareNotificationDelivery,
  registerStubPush,
  serializeNotificationPreferences,
  unregisterPush,
  withPermissionStatus,
  type NotificationDeliveryPayload,
  type NotificationPreferences,
  type PushPermissionStatus,
} from "@fitness-battle/shared";

function readStored(): NotificationPreferences {
  if (typeof window === "undefined") {
    return parseNotificationPreferences(null);
  }
  return parseNotificationPreferences(
    localStorage.getItem(NOTIFICATION_STORAGE_KEY),
  );
}

function writeStored(prefs: NotificationPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    NOTIFICATION_STORAGE_KEY,
    serializeNotificationPreferences(prefs),
  );
}

function browserPermission(): PushPermissionStatus {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }
  switch (Notification.permission) {
    case "granted":
      return "granted";
    case "denied":
      return "denied";
    default:
      return "prompt";
  }
}

export function loadNotificationPreferences(): NotificationPreferences {
  const prefs = readStored();
  const browser = browserPermission();
  // Keep stub status when already stub-registered; otherwise mirror the browser.
  if (prefs.permissionStatus === "stub" && prefs.registration?.stub) {
    return prefs;
  }
  if (browser !== prefs.permissionStatus && browser !== "unsupported") {
    const next = withPermissionStatus(prefs, browser);
    writeStored(next);
    return next;
  }
  if (browser === "unsupported" && prefs.permissionStatus === "unknown") {
    const next = withPermissionStatus(prefs, "unsupported");
    writeStored(next);
    return next;
  }
  return prefs;
}

export function saveNotificationPreferences(
  prefs: NotificationPreferences,
): NotificationPreferences {
  const next = normalizeNotificationPreferences(prefs);
  writeStored(next);
  return next;
}

/**
 * Enable push on web: ask the browser when possible, then register a stub
 * device token. Live FCM/web-push endpoints are not wired yet.
 */
export async function enableWebPush(): Promise<NotificationPreferences> {
  let prefs = loadNotificationPreferences();
  const hasApi = typeof window !== "undefined" && typeof Notification !== "undefined";

  if (!hasApi) {
    prefs = registerStubPush(prefs, "web");
    return saveNotificationPreferences(prefs);
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission === "denied") {
    prefs = withPermissionStatus(
      { ...prefs, enabled: false, registration: null },
      "denied",
    );
    return saveNotificationPreferences(prefs);
  }

  if (permission === "granted") {
    const now = new Date();
    prefs = {
      ...prefs,
      enabled: true,
      permissionStatus: "granted",
      registration: {
        platform: "web",
        token: createStubPushToken("web", now),
        registeredAt: now.toISOString(),
        stub: true,
      },
      updatedAt: now.toISOString(),
    };
    return saveNotificationPreferences(prefs);
  }

  // Safari / restricted contexts may leave permission unsettled — still stub.
  prefs = registerStubPush(prefs, "web");
  return saveNotificationPreferences(prefs);
}

export function disableWebPush(): NotificationPreferences {
  const prefs = unregisterPush(loadNotificationPreferences());
  return saveNotificationPreferences(prefs);
}

export type DeliverResult =
  | { ok: true; mode: "browser" | "in_app"; payload: NotificationDeliveryPayload }
  | { ok: false; reason: "blocked" };

/** Fire a local/stub notification if prefs allow it. */
export function deliverWebNotification(
  payload: NotificationDeliveryPayload,
): DeliverResult {
  const prefs = loadNotificationPreferences();
  const prepared = prepareNotificationDelivery(prefs, payload);
  if (!prepared) return { ok: false, reason: "blocked" };

  if (
    typeof Notification !== "undefined" &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification(prepared.title, { body: prepared.body });
      return { ok: true, mode: "browser", payload: prepared };
    } catch {
      // Fall through to in-app acknowledgement.
    }
  }

  return { ok: true, mode: "in_app", payload: prepared };
}
