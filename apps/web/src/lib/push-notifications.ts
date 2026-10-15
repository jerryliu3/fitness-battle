import {
  NOTIFICATION_STORAGE_KEY,
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

  // Local stub registration (no Notification API grant) stays as-is.
  if (prefs.permissionStatus === "stub" && prefs.registration?.stub) {
    return prefs;
  }

  if (browser === "unsupported") {
    if (prefs.permissionStatus === "unknown") {
      const next = withPermissionStatus(prefs, "unsupported");
      writeStored(next);
      return next;
    }
    return prefs;
  }

  if (browser !== prefs.permissionStatus) {
    const next = withPermissionStatus(prefs, browser);
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
  const prefs = loadNotificationPreferences();
  const hasApi =
    typeof window !== "undefined" && typeof Notification !== "undefined";

  if (!hasApi) {
    return saveNotificationPreferences(registerStubPush(prefs, "web"));
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission === "denied") {
    return saveNotificationPreferences(
      withPermissionStatus(
        { ...prefs, enabled: false, registration: null },
        "denied",
      ),
    );
  }

  if (permission === "granted") {
    return saveNotificationPreferences(
      registerStubPush(prefs, "web", new Date(), "granted"),
    );
  }

  // Restricted contexts may leave permission unsettled — still stub.
  return saveNotificationPreferences(registerStubPush(prefs, "web"));
}

export function disableWebPush(): NotificationPreferences {
  return saveNotificationPreferences(
    unregisterPush(loadNotificationPreferences()),
  );
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
