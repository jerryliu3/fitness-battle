import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_MAYBE_LATER_COOLDOWN_MS,
  canShowNotificationOptIn,
  defaultNotificationPreferences,
  defaultNotificationPromptState,
  notificationOptInCopy,
  parseNotificationPromptState,
  recordNotificationMaybeLater,
  serializeNotificationPromptState,
} from "./index";

describe("notification opt-in helpers", () => {
  it("shows opt-in when permission is unknown and not recently dismissed", () => {
    const now = new Date("2026-11-23T12:00:00Z");
    const prefs = defaultNotificationPreferences(now);
    expect(
      canShowNotificationOptIn(prefs, defaultNotificationPromptState(), now),
    ).toBe(true);
  });

  it("hides opt-in when already enabled or OS denied/unsupported", () => {
    const now = new Date("2026-11-23T12:00:00Z");
    const base = defaultNotificationPreferences(now);
    const promptState = defaultNotificationPromptState();

    expect(
      canShowNotificationOptIn(
        { ...base, enabled: true, permissionStatus: "granted" },
        promptState,
        now,
      ),
    ).toBe(false);
    expect(
      canShowNotificationOptIn(
        { ...base, enabled: true, permissionStatus: "stub" },
        promptState,
        now,
      ),
    ).toBe(false);
    expect(
      canShowNotificationOptIn(
        { ...base, permissionStatus: "denied" },
        promptState,
        now,
      ),
    ).toBe(false);
    expect(
      canShowNotificationOptIn(
        { ...base, permissionStatus: "unsupported" },
        promptState,
        now,
      ),
    ).toBe(false);
  });

  it("enforces a 7-day cooldown after Maybe later", () => {
    const dismissedAt = new Date("2026-11-10T12:00:00Z");
    const prefs = defaultNotificationPreferences(dismissedAt);
    const saved = parseNotificationPromptState(
      serializeNotificationPromptState(
        recordNotificationMaybeLater(dismissedAt),
      ),
    );

    const sixDaysLater = new Date(
      dismissedAt.getTime() + NOTIFICATION_MAYBE_LATER_COOLDOWN_MS - 1000,
    );
    expect(canShowNotificationOptIn(prefs, saved, sixDaysLater)).toBe(false);

    const sevenDaysLater = new Date(
      dismissedAt.getTime() + NOTIFICATION_MAYBE_LATER_COOLDOWN_MS,
    );
    expect(canShowNotificationOptIn(prefs, saved, sevenDaysLater)).toBe(true);
  });

  it("returns contextual copy and category per surface", () => {
    expect(
      notificationOptInCopy("competition_moment", { hasOvertake: true }),
    ).toEqual({
      ctaLabel: "Notify me if I get overtaken",
      dismissLabel: "Maybe later",
      category: "rival_moves",
    });

    expect(
      notificationOptInCopy("competition_moment", { hasOvertake: false }),
    ).toEqual({
      ctaLabel: "Notify me when my position changes",
      dismissLabel: "Maybe later",
      category: "rival_moves",
    });

    expect(notificationOptInCopy("week_recap")).toEqual({
      ctaLabel: "Notify me when the week settles",
      dismissLabel: "Maybe later",
      category: "week_summary",
    });
  });
});
