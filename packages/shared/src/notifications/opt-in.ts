import type { NotificationCategoryId, NotificationPreferences } from "./types";

export const NOTIFICATION_OPT_IN_STORAGE_KEY = "fb-notification-opt-in-v1";
export const NOTIFICATION_MAYBE_LATER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export type NotificationPromptSurface = "competition_moment" | "week_recap";

export interface NotificationPromptState {
  maybeLaterAt: string | null;
}

export function defaultNotificationPromptState(): NotificationPromptState {
  return { maybeLaterAt: null };
}

export function parseNotificationPromptState(
  raw: string | null | undefined,
): NotificationPromptState {
  if (!raw) return defaultNotificationPromptState();
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      maybeLaterAt:
        typeof parsed?.maybeLaterAt === "string" ? parsed.maybeLaterAt : null,
    };
  } catch {
    return defaultNotificationPromptState();
  }
}

export function serializeNotificationPromptState(
  state: NotificationPromptState,
): string {
  return JSON.stringify(state);
}

export function recordNotificationMaybeLater(
  now: Date = new Date(),
): NotificationPromptState {
  return { maybeLaterAt: now.toISOString() };
}

/**
 * Show the one-tap opt-in CTA only when OS permission has not been decided
 * and the user has not recently tapped "Maybe later".
 */
export function canShowNotificationOptIn(
  prefs: NotificationPreferences,
  promptState: NotificationPromptState,
  now: Date = new Date(),
): boolean {
  if (
    prefs.enabled &&
    (prefs.permissionStatus === "granted" || prefs.permissionStatus === "stub")
  ) {
    return false;
  }
  if (
    prefs.permissionStatus === "denied" ||
    prefs.permissionStatus === "unsupported"
  ) {
    return false;
  }
  if (promptState.maybeLaterAt) {
    const dismissedAt = Date.parse(promptState.maybeLaterAt);
    if (
      Number.isFinite(dismissedAt) &&
      now.getTime() - dismissedAt < NOTIFICATION_MAYBE_LATER_COOLDOWN_MS
    ) {
      return false;
    }
  }
  return true;
}

export function notificationOptInCopy(
  surface: NotificationPromptSurface,
  context?: { hasOvertake?: boolean },
): {
  ctaLabel: string;
  dismissLabel: string;
  category: NotificationCategoryId;
} {
  if (surface === "week_recap") {
    return {
      ctaLabel: "Notify me when the week settles",
      dismissLabel: "Maybe later",
      category: "week_summary",
    };
  }
  return {
    ctaLabel: context?.hasOvertake
      ? "Notify me if I get overtaken"
      : "Notify me when my position changes",
    dismissLabel: "Maybe later",
    category: "rival_moves",
  };
}
