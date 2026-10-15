import {
  canDeliverNotification,
  notificationEvent,
  type NotificationCategoryId,
} from "@fitness-battle/shared";
import {
  loadNotificationPreferences,
  type SyncIdentity,
} from "@/lib/push-notifications";

/**
 * Fire a product notification: local browser banner when possible, and
 * account delivery via /api/notifications/send when signed in.
 */
export async function requestAccountPush(
  category: NotificationCategoryId,
  identity: SyncIdentity | null | undefined,
  detail?: { place?: number; provider?: string; sport?: string },
): Promise<void> {
  const prefs = loadNotificationPreferences();
  if (!canDeliverNotification(prefs, category)) return;

  const payload = notificationEvent(category, detail);

  if (
    typeof Notification !== "undefined" &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification(payload.title, { body: payload.body });
    } catch {
      // Ignore — remote path may still record.
    }
  }

  if (!identity) return;

  try {
    await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: identity.userId,
        payload,
        allowStub: identity.localOnly,
      }),
    });
  } catch {
    // Best-effort.
  }
}
