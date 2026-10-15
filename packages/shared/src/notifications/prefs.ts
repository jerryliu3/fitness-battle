import type {
  NotificationCategoryId,
  NotificationCategoryMeta,
  NotificationDeliveryPayload,
  NotificationPlatform,
  NotificationPreferences,
  PushPermissionStatus,
  PushRegistration,
} from "./types";

export const NOTIFICATION_STORAGE_KEY = "fb-notifications-v1";

export const NOTIFICATION_CATEGORIES: NotificationCategoryMeta[] = [
  {
    id: "week_summary",
    label: "Week summary",
    description: "When your week settles and the board closes.",
  },
  {
    id: "rival_moves",
    label: "Rival moves",
    description: "When someone nearby jumps the board or starts a duel.",
  },
  {
    id: "lesson_reminder",
    label: "Lesson reminder",
    description: "A nudge if today’s lesson is still open.",
  },
  {
    id: "connection_alerts",
    label: "Connection alerts",
    description: "Sync failures or a tracker that stopped sending.",
  },
];

const CATEGORY_IDS = NOTIFICATION_CATEGORIES.map((item) => item.id);

export function defaultNotificationPreferences(
  now: Date = new Date(),
): NotificationPreferences {
  return {
    version: 1,
    enabled: false,
    categories: {
      week_summary: true,
      rival_moves: true,
      lesson_reminder: false,
      connection_alerts: true,
    },
    permissionStatus: "unknown",
    registration: null,
    updatedAt: now.toISOString(),
  };
}

function isCategoryId(value: unknown): value is NotificationCategoryId {
  return (
    typeof value === "string" &&
    (CATEGORY_IDS as string[]).includes(value)
  );
}

function isPlatform(value: unknown): value is NotificationPlatform {
  return value === "web" || value === "ios" || value === "android";
}

function isPermission(value: unknown): value is PushPermissionStatus {
  return (
    value === "unknown" ||
    value === "prompt" ||
    value === "granted" ||
    value === "denied" ||
    value === "unsupported" ||
    value === "stub"
  );
}

function normalizeRegistration(
  raw: unknown,
): PushRegistration | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (!isPlatform(row.platform)) return null;
  return {
    platform: row.platform,
    token: typeof row.token === "string" ? row.token : null,
    registeredAt:
      typeof row.registeredAt === "string" ? row.registeredAt : null,
    stub: row.stub !== false,
  };
}

/** Coerce stored JSON into a valid preferences object. */
export function normalizeNotificationPreferences(
  raw: unknown,
  now: Date = new Date(),
): NotificationPreferences {
  const fallback = defaultNotificationPreferences(now);
  if (!raw || typeof raw !== "object") return fallback;
  const row = raw as Record<string, unknown>;
  const categories = { ...fallback.categories };
  if (row.categories && typeof row.categories === "object") {
    for (const [key, value] of Object.entries(
      row.categories as Record<string, unknown>,
    )) {
      if (isCategoryId(key) && typeof value === "boolean") {
        categories[key] = value;
      }
    }
  }
  return {
    version: 1,
    enabled: row.enabled === true,
    categories,
    permissionStatus: isPermission(row.permissionStatus)
      ? row.permissionStatus
      : "unknown",
    registration: normalizeRegistration(row.registration),
    updatedAt:
      typeof row.updatedAt === "string" ? row.updatedAt : now.toISOString(),
  };
}

export function parseNotificationPreferences(
  raw: string | null | undefined,
  now: Date = new Date(),
): NotificationPreferences {
  if (!raw) return defaultNotificationPreferences(now);
  try {
    return normalizeNotificationPreferences(JSON.parse(raw), now);
  } catch {
    return defaultNotificationPreferences(now);
  }
}

export function serializeNotificationPreferences(
  prefs: NotificationPreferences,
): string {
  return JSON.stringify(prefs);
}

export function setMasterEnabled(
  prefs: NotificationPreferences,
  enabled: boolean,
  now: Date = new Date(),
): NotificationPreferences {
  return {
    ...prefs,
    enabled,
    updatedAt: now.toISOString(),
  };
}

export function setCategoryEnabled(
  prefs: NotificationPreferences,
  category: NotificationCategoryId,
  enabled: boolean,
  now: Date = new Date(),
): NotificationPreferences {
  return {
    ...prefs,
    categories: { ...prefs.categories, [category]: enabled },
    updatedAt: now.toISOString(),
  };
}

export function withPermissionStatus(
  prefs: NotificationPreferences,
  permissionStatus: PushPermissionStatus,
  now: Date = new Date(),
): NotificationPreferences {
  return {
    ...prefs,
    permissionStatus,
    updatedAt: now.toISOString(),
  };
}

/** Whether a category may deliver given current prefs + permission. */
export function canDeliverNotification(
  prefs: NotificationPreferences,
  category: NotificationCategoryId,
): boolean {
  if (!prefs.enabled) return false;
  if (!prefs.categories[category]) return false;
  if (
    prefs.permissionStatus !== "granted" &&
    prefs.permissionStatus !== "stub"
  ) {
    return false;
  }
  if (!prefs.registration?.token) return false;
  return true;
}

export function createStubPushToken(
  platform: NotificationPlatform,
  now: Date = new Date(),
): string {
  const stamp = now.getTime().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `stub-${platform}-${stamp}-${rand}`;
}

/**
 * Arm push with a stub device token.
 * Reuses an existing token for the same platform when present.
 * `permissionStatus` defaults to `stub` (no OS grant); pass `granted` when
 * the browser/OS already allowed notifications.
 */
export function registerStubPush(
  prefs: NotificationPreferences,
  platform: NotificationPlatform,
  now: Date = new Date(),
  permissionStatus: PushPermissionStatus = "stub",
): NotificationPreferences {
  const existing =
    prefs.registration?.platform === platform && prefs.registration.token
      ? prefs.registration
      : null;
  return {
    ...prefs,
    enabled: true,
    permissionStatus,
    registration: existing
      ? { ...existing, stub: true }
      : {
          platform,
          token: createStubPushToken(platform, now),
          registeredAt: now.toISOString(),
          stub: true,
        },
    updatedAt: now.toISOString(),
  };
}

/**
 * Turn push off and clear the device registration.
 * Preserves real OS permission (`granted` / `denied` / …); only a local
 * `stub` status falls back to `prompt`.
 */
export function unregisterPush(
  prefs: NotificationPreferences,
  now: Date = new Date(),
): NotificationPreferences {
  return {
    ...prefs,
    enabled: false,
    permissionStatus:
      prefs.permissionStatus === "stub" ? "prompt" : prefs.permissionStatus,
    registration: null,
    updatedAt: now.toISOString(),
  };
}

/**
 * Pure gate used by clients before showing a local/stub notification.
 * Returns null when delivery should be skipped.
 */
export function prepareNotificationDelivery(
  prefs: NotificationPreferences,
  payload: NotificationDeliveryPayload,
): NotificationDeliveryPayload | null {
  if (!canDeliverNotification(prefs, payload.category)) return null;
  return payload;
}

export function permissionLabel(status: PushPermissionStatus): string {
  switch (status) {
    case "granted":
      return "Allowed";
    case "denied":
      return "Blocked";
    case "unsupported":
      return "Not supported here";
    case "stub":
      return "Stub registered";
    case "prompt":
      return "Not asked yet";
    default:
      return "Unknown";
  }
}
