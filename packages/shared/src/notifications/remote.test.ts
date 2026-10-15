import { describe, expect, it } from "vitest";
import {
  pickDevice,
  preferencesFromRemote,
  preferencesToRow,
  type PushDeviceRow,
} from "./remote";
import { defaultNotificationPreferences } from "./prefs";

const NOW = new Date("2026-10-15T12:00:00.000Z");

const device = (over: Partial<PushDeviceRow> = {}): PushDeviceRow => ({
  id: "d1",
  user_id: "u1",
  platform: "web",
  token: "stub-web-abc",
  stub: true,
  permission_status: "granted",
  created_at: "2026-10-15T11:00:00.000Z",
  updated_at: "2026-10-15T11:00:00.000Z",
  last_seen_at: "2026-10-15T11:00:00.000Z",
  ...over,
});

describe("notification remote mapping", () => {
  it("round-trips category columns", () => {
    const prefs = defaultNotificationPreferences(NOW);
    prefs.enabled = true;
    prefs.categories.lesson_reminder = true;
    const row = preferencesToRow("u1", prefs);
    expect(row.lesson_reminder).toBe(true);
    const back = preferencesFromRemote(row, [device()], "web", NOW);
    expect(back.enabled).toBe(true);
    expect(back.categories.lesson_reminder).toBe(true);
    expect(back.registration?.token).toBe("stub-web-abc");
    expect(back.permissionStatus).toBe("granted");
  });

  it("prefers the newest device for the requested platform", () => {
    const picked = pickDevice(
      [
        device({
          id: "old",
          platform: "web",
          updated_at: "2026-10-14T00:00:00.000Z",
          token: "old",
        }),
        device({
          id: "ios",
          platform: "ios",
          updated_at: "2026-10-16T00:00:00.000Z",
          token: "ios-token",
        }),
        device({
          id: "new",
          platform: "web",
          updated_at: "2026-10-15T13:00:00.000Z",
          token: "new",
        }),
      ],
      "web",
    );
    expect(picked?.token).toBe("new");
  });
});
