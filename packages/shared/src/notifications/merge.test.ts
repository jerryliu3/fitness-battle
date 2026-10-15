import { describe, expect, it } from "vitest";
import { mergeNotificationPreferences } from "./merge";
import {
  defaultNotificationPreferences,
  registerPushDevice,
  registerStubPush,
} from "./prefs";

const NOW = new Date("2026-10-15T12:00:00.000Z");
const LATER = new Date("2026-10-15T13:00:00.000Z");

describe("mergeNotificationPreferences", () => {
  it("keeps a local Expo token when remote has none", () => {
    const local = registerPushDevice(defaultNotificationPreferences(NOW), {
      platform: "ios",
      token: "ExponentPushToken[local]",
      stub: false,
      permissionStatus: "granted",
      now: NOW,
    });
    const remote = defaultNotificationPreferences(LATER);
    remote.enabled = false;
    const merged = mergeNotificationPreferences(local, remote);
    expect(merged.registration?.token).toBe("ExponentPushToken[local]");
    expect(merged.enabled).toBe(true);
  });

  it("prefers newer remote categories", () => {
    const local = registerStubPush(defaultNotificationPreferences(NOW), "web", NOW);
    local.categories.lesson_reminder = false;
    const remote = registerStubPush(
      defaultNotificationPreferences(LATER),
      "web",
      LATER,
    );
    remote.categories.lesson_reminder = true;
    const merged = mergeNotificationPreferences(local, remote);
    expect(merged.categories.lesson_reminder).toBe(true);
  });
});
