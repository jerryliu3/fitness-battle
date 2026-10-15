/** Platforms that can register for push delivery. */
export type NotificationPlatform = "web" | "ios" | "android";

/**
 * Preference categories users can toggle independently.
 * Delivery is stubbed until a real push provider is wired.
 */
export type NotificationCategoryId =
  | "week_summary"
  | "rival_moves"
  | "lesson_reminder"
  | "connection_alerts";

export type PushPermissionStatus =
  | "unknown"
  | "prompt"
  | "granted"
  | "denied"
  | "unsupported"
  /** Local stub registration — not a live OS / FCM / APNs grant. */
  | "stub";

export interface NotificationCategoryMeta {
  id: NotificationCategoryId;
  label: string;
  description: string;
}

export interface PushRegistration {
  platform: NotificationPlatform;
  /** Opaque device token (stub or real). */
  token: string | null;
  registeredAt: string | null;
  /** True when the token is a local stub, not a live push endpoint. */
  stub: boolean;
}

export interface NotificationPreferences {
  version: 1;
  /** Master switch — when false, no category should fire. */
  enabled: boolean;
  categories: Record<NotificationCategoryId, boolean>;
  permissionStatus: PushPermissionStatus;
  registration: PushRegistration | null;
  updatedAt: string;
}

export interface NotificationDeliveryPayload {
  category: NotificationCategoryId;
  title: string;
  body: string;
  /** Optional deep-link path for clients that support it. */
  path?: string;
}
