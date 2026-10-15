import { describe, expect, it } from "vitest";
import {
  buildExpoPushMessage,
  liveExpoTokensFromRegistrations,
} from "./expo-push";
import { isExpoPushToken, registerPushDevice, registerStubPush } from "./prefs";
import { defaultNotificationPreferences } from "./prefs";

const NOW = new Date("2026-10-15T12:00:00.000Z");

describe("expo push helpers", () => {
  it("detects Expo push tokens", () => {
    expect(isExpoPushToken("ExponentPushToken[abc123]")).toBe(true);
    expect(isExpoPushToken("stub-web-abc")).toBe(false);
    expect(isExpoPushToken(null)).toBe(false);
  });

  it("builds a push message only for Expo tokens", () => {
    expect(
      buildExpoPushMessage("stub-ios-1", {
        category: "week_summary",
        title: "Hi",
        body: "There",
        path: "/settings",
      }),
    ).toBeNull();
    expect(
      buildExpoPushMessage("ExponentPushToken[xyz]", {
        category: "week_summary",
        title: "Hi",
        body: "There",
        path: "/settings",
      }),
    ).toEqual({
      to: "ExponentPushToken[xyz]",
      title: "Hi",
      body: "There",
      sound: "default",
      channelId: "default",
      data: { category: "week_summary", path: "/settings" },
    });
  });

  it("keeps a live Expo token when re-arming stub registration", () => {
    let prefs = registerPushDevice(defaultNotificationPreferences(NOW), {
      platform: "ios",
      token: "ExponentPushToken[keep]",
      stub: false,
      permissionStatus: "granted",
      now: NOW,
    });
    prefs = registerStubPush(prefs, "ios", NOW, "stub");
    expect(prefs.registration?.token).toBe("ExponentPushToken[keep]");
    expect(prefs.registration?.stub).toBe(false);
    expect(prefs.permissionStatus).toBe("granted");
  });

  it("filters live Expo tokens from registrations", () => {
    expect(
      liveExpoTokensFromRegistrations([
        { token: "ExponentPushToken[a]", stub: false },
        { token: "ExponentPushToken[b]", stub: true },
        { token: "stub-web-1", stub: false },
        null,
      ]),
    ).toEqual(["ExponentPushToken[a]"]);
  });
});
