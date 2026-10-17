import {
  NOTIFICATION_STORAGE_KEY,
  mergeNotificationPreferences,
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

export type SyncIdentity = {
  userId: string;
  /** Demo / offline accounts stay device-local. */
  localOnly: boolean;
};

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

/** Reconcile stored prefs with the live Notification permission. */
export function reconcileBrowserPermission(
  prefs: NotificationPreferences,
): NotificationPreferences {
  const browser = browserPermission();

  if (browser === "denied") {
    if (
      prefs.permissionStatus === "denied" &&
      !prefs.enabled &&
      !prefs.registration
    ) {
      return prefs;
    }
    return withPermissionStatus(
      { ...prefs, enabled: false, registration: null },
      "denied",
    );
  }

  if (browser === "granted") {
    if (prefs.permissionStatus === "granted") return prefs;
    return withPermissionStatus(prefs, "granted");
  }

  if (browser === "unsupported") {
    if (prefs.permissionStatus === "unknown") {
      return withPermissionStatus(prefs, "unsupported");
    }
    return prefs;
  }

  // browser === prompt — keep an active local stub registration as-is.
  if (prefs.permissionStatus === "stub" && prefs.registration?.stub) {
    return prefs;
  }
  if (browser !== prefs.permissionStatus) {
    return withPermissionStatus(prefs, browser);
  }
  return prefs;
}

export function loadNotificationPreferences(): NotificationPreferences {
  const stored = readStored();
  const reconciled = reconcileBrowserPermission(stored);
  if (
    reconciled.permissionStatus !== stored.permissionStatus ||
    reconciled.enabled !== stored.enabled ||
    reconciled.registration?.token !== stored.registration?.token
  ) {
    writeStored(reconciled);
  }
  return reconciled;
}

export function saveNotificationPreferences(
  prefs: NotificationPreferences,
): NotificationPreferences {
  const next = normalizeNotificationPreferences(prefs);
  writeStored(next);
  return next;
}

async function persistRemote(
  prefs: NotificationPreferences,
  identity: SyncIdentity | null | undefined,
  options: { registerDevice?: boolean; clearDevices?: boolean } = {},
): Promise<{ prefs: NotificationPreferences; persisted: boolean }> {
  if (!identity || identity.localOnly) {
    return { prefs, persisted: false };
  }
  try {
    const response = await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: identity.userId,
        prefs,
        platform: prefs.registration?.platform ?? "web",
        registerDevice: options.registerDevice ?? prefs.enabled,
        clearDevices: options.clearDevices ?? false,
      }),
    });
    const body = (await response.json()) as {
      prefs?: NotificationPreferences;
      persisted?: boolean;
    };
    if (!response.ok || !body.prefs) {
      return { prefs, persisted: false };
    }
    const merged = saveNotificationPreferences(
      normalizeNotificationPreferences(body.prefs),
    );
    return { prefs: merged, persisted: body.persisted === true };
  } catch {
    return { prefs, persisted: false };
  }
}

export async function hydrateNotificationPreferences(
  identity: SyncIdentity | null | undefined,
): Promise<NotificationPreferences> {
  const local = loadNotificationPreferences();
  if (!identity || identity.localOnly) return local;
  try {
    const response = await fetch(
      `/api/notifications?userId=${encodeURIComponent(identity.userId)}&platform=web`,
    );
    if (!response.ok) return local;
    const body = (await response.json()) as {
      prefs?: NotificationPreferences;
      persisted?: boolean;
    };
    if (!body.prefs || body.persisted === false) return local;
    const merged = reconcileBrowserPermission(
      mergeNotificationPreferences(
        local,
        normalizeNotificationPreferences(body.prefs),
      ),
    );
    return saveNotificationPreferences(merged);
  } catch {
    return local;
  }
}

/**
 * Enable push on web: ask the browser when possible, then register a stub
 * device token and sync to the account when live auth is available.
 */
export async function enableWebPush(
  identity?: SyncIdentity | null,
): Promise<NotificationPreferences> {
  const prefs = loadNotificationPreferences();
  const hasApi =
    typeof window !== "undefined" && typeof Notification !== "undefined";

  let next: NotificationPreferences;
  if (!hasApi) {
    next = registerStubPush(prefs, "web");
  } else {
    let permission = Notification.permission;
    if (permission === "default") {
      try {
        permission = await Notification.requestPermission();
      } catch {
        permission = "default";
      }
    }
    if (permission === "denied") {
      next = withPermissionStatus(
        { ...prefs, enabled: false, registration: null },
        "denied",
      );
      return (await persistRemote(saveNotificationPreferences(next), identity, {
        clearDevices: true,
      })).prefs;
    }
    if (permission !== "granted") {
      next = withPermissionStatus(
        { ...prefs, enabled: false, registration: null },
        "prompt",
      );
      return (await persistRemote(saveNotificationPreferences(next), identity, {
        clearDevices: true,
      })).prefs;
    }
    next = registerStubPush(prefs, "web", new Date(), "granted");
  }

  const saved = saveNotificationPreferences(next);
  return (await persistRemote(saved, identity, { registerDevice: true })).prefs;
}

export async function disableWebPush(
  identity?: SyncIdentity | null,
): Promise<NotificationPreferences> {
  const saved = saveNotificationPreferences(
    unregisterPush(loadNotificationPreferences()),
  );
  return (await persistRemote(saved, identity, { clearDevices: true })).prefs;
}

export async function updateCategoryPreferences(
  prefs: NotificationPreferences,
  identity?: SyncIdentity | null,
): Promise<NotificationPreferences> {
  const saved = saveNotificationPreferences(prefs);
  return (await persistRemote(saved, identity, { registerDevice: saved.enabled }))
    .prefs;
}

export type DeliverResult =
  | {
      ok: true;
      mode: "browser" | "in_app" | "stub";
      payload: NotificationDeliveryPayload;
      persisted?: boolean;
    }
  | { ok: false; reason: "blocked" };

/** Fire a local notification and record a stub outbox row when signed in. */
export async function deliverWebNotification(
  payload: NotificationDeliveryPayload,
  identity?: SyncIdentity | null,
): Promise<DeliverResult> {
  const prefs = loadNotificationPreferences();
  const prepared = prepareNotificationDelivery(prefs, payload);
  if (!prepared) return { ok: false, reason: "blocked" };

  let mode: "browser" | "in_app" = "in_app";
  if (
    typeof Notification !== "undefined" &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification(prepared.title, { body: prepared.body });
      mode = "browser";
    } catch {
      mode = "in_app";
    }
  }

  if (identity && !identity.localOnly) {
    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: identity.userId,
          payload: prepared,
          prefs,
        }),
      });
      const body = (await response.json()) as { persisted?: boolean; ok?: boolean };
      if (response.ok && body.ok) {
        return {
          ok: true,
          mode: mode === "browser" ? "browser" : "stub",
          payload: prepared,
          persisted: body.persisted === true,
        };
      }
    } catch {
      // Local delivery already happened.
    }
  }

  return { ok: true, mode, payload: prepared };
}
