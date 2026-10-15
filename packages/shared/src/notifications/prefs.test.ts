import { describe, expect, it } from "vitest";
import {
  canDeliverNotification,
  defaultNotificationPreferences,
  normalizeNotificationPreferences,
  parseNotificationPreferences,
  prepareNotificationDelivery,
  registerStubPush,
  setCategoryEnabled,
  setMasterEnabled,
  unregisterPush,
  withPermissionStatus,
} from "./prefs";

const NOW = new Date("2026-10-15T12:00:00.000Z");

describe("notification preferences", () => {
  it("defaults to master off with sensible categories", () => {
    const prefs = defaultNotificationPreferences(NOW);
    expect(prefs.enabled).toBe(false);
    expect(prefs.categories.week_summary).toBe(true);
    expect(prefs.categories.lesson_reminder).toBe(false);
    expect(prefs.permissionStatus).toBe("unknown");
    expect(prefs.registration).toBeNull();
  });

  it("normalizes bad stored JSON into defaults", () => {
    expect(parseNotificationPreferences("not-json", NOW).version).toBe(1);
    const prefs = normalizeNotificationPreferences(
      {
        enabled: "yes",
        categories: { week_summary: false, bogus: true },
        permissionStatus: "nope",
      },
      NOW,
    );
    expect(prefs.enabled).toBe(false);
    expect(prefs.categories.week_summary).toBe(false);
    expect(prefs.categories.rival_moves).toBe(true);
    expect(prefs.permissionStatus).toBe("unknown");
  });

  it("registers a stub token and allows delivery for enabled categories", () => {
    let prefs = defaultNotificationPreferences(NOW);
    prefs = registerStubPush(prefs, "web", NOW);
    expect(prefs.enabled).toBe(true);
    expect(prefs.permissionStatus).toBe("stub");
    expect(prefs.registration?.token).toMatch(/^stub-web-/);
    expect(prefs.registration?.stub).toBe(true);
    expect(canDeliverNotification(prefs, "week_summary")).toBe(true);
    expect(canDeliverNotification(prefs, "lesson_reminder")).toBe(false);

    prefs = setCategoryEnabled(prefs, "lesson_reminder", true, NOW);
    expect(
      prepareNotificationDelivery(prefs, {
        category: "lesson_reminder",
        title: "Lesson",
        body: "Still open",
      }),
    ).toEqual({
      category: "lesson_reminder",
      title: "Lesson",
      body: "Still open",
    });
  });

  it("reuses an existing stub token and can record a granted permission", () => {
    const first = registerStubPush(defaultNotificationPreferences(NOW), "ios", NOW);
    const again = registerStubPush(first, "ios", NOW, "granted");
    expect(again.registration?.token).toBe(first.registration?.token);
    expect(again.permissionStatus).toBe("granted");
  });

  it("blocks delivery when master is off or unregistered", () => {
    let prefs = registerStubPush(defaultNotificationPreferences(NOW), "ios", NOW);
    prefs = setMasterEnabled(prefs, false, NOW);
    expect(canDeliverNotification(prefs, "week_summary")).toBe(false);

    prefs = unregisterPush(
      registerStubPush(defaultNotificationPreferences(NOW), "android", NOW),
      NOW,
    );
    expect(prefs.enabled).toBe(false);
    expect(prefs.registration).toBeNull();
    expect(prefs.permissionStatus).toBe("prompt");
    expect(canDeliverNotification(prefs, "connection_alerts")).toBe(false);
  });

  it("keeps granted OS permission when unregistering", () => {
    let prefs = registerStubPush(
      defaultNotificationPreferences(NOW),
      "web",
      NOW,
      "granted",
    );
    prefs = unregisterPush(prefs, NOW);
    expect(prefs.enabled).toBe(false);
    expect(prefs.registration).toBeNull();
    expect(prefs.permissionStatus).toBe("granted");
  });

  it("does not deliver when permission is denied even if enabled is flipped", () => {
    const prefs = withPermissionStatus(
      {
        ...registerStubPush(defaultNotificationPreferences(NOW), "web", NOW),
        enabled: true,
      },
      "denied",
      NOW,
    );
    expect(canDeliverNotification(prefs, "week_summary")).toBe(false);
  });
});
