import { describe, expect, it, vi, beforeEach } from "vitest";

const deliverMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/deliver-notification", () => ({
  deliverNotificationToUser: deliverMock,
}));

import {
  localDateAndHour,
  maybeSendMorningRecoveryPush,
  runEveningDailySummaries,
} from "./daily-digest-push";

describe("daily-digest-push", () => {
  beforeEach(() => {
    deliverMock.mockReset();
    deliverMock.mockResolvedValue({ ok: true, mode: "expo" });
  });

  it("resolves local date and hour for user timezone", () => {
    const now = new Date("2026-11-24T04:15:00.000Z"); // 23:15 America/New_York
    expect(localDateAndHour(now, "America/New_York")).toEqual({
      day: "2026-11-23",
      hour: 23,
    });
  });

  it("sends morning recovery check-in once when unseen for today", async () => {
    const updateMock = vi.fn().mockReturnValue({ eq: async () => ({ error: null }) });
    const db = {
      from: (table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { timezone: "America/New_York" } }),
              }),
            }),
          };
        }
        if (table === "notification_preferences") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    enabled: true,
                    daily_digest: true,
                    last_recovery_checkin_day: "2026-11-22",
                  },
                }),
              }),
            }),
            update: updateMock,
          };
        }
        if (table === "sleep_nights") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({
                        data: { duration_min: 460, score: 86 },
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "readiness_marks") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: { score: 88 } }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      },
    } as never;

    const sent = await maybeSendMorningRecoveryPush(
      db,
      "user-1",
      new Date("2026-11-23T13:00:00.000Z"),
    );
    expect(sent).toBe(true);
    expect(deliverMock).toHaveBeenCalledWith(
      db,
      "user-1",
      expect.objectContaining({
        category: "daily_digest",
        title: "Morning check-in",
        body: "7h 40m sleep · Recovery 88.",
      }),
      { requireLive: true },
    );
    expect(updateMock).toHaveBeenCalledWith({
      last_recovery_checkin_day: "2026-11-23",
    });
  });

  it("sends 11 PM evening summary with steps and fallback recovery", async () => {
    const updateMock = vi.fn().mockReturnValue({ eq: async () => ({ error: null }) });
    const db = {
      from: (table: string) => {
        if (table === "notification_preferences") {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [
                    {
                      user_id: "user-1",
                      last_recovery_checkin_day: null,
                      last_daily_summary_day: null,
                    },
                  ],
                }),
              }),
            }),
            update: updateMock,
          };
        }
        if (table === "profiles") {
          return {
            select: () => ({
              in: async () => ({
                data: [{ id: "user-1", timezone: "America/New_York" }],
              }),
            }),
          };
        }
        if (table === "daily_health") {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({ data: [{ steps: 8420 }] }),
              }),
            }),
          };
        }
        if (table === "sleep_nights") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "readiness_marks") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: { score: 82 } }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      },
    } as never;

    const result = await runEveningDailySummaries(
      db,
      new Date("2026-11-24T04:15:00.000Z"), // 23:15 New York
    );
    expect(result).toEqual({ sent: 1 });
    expect(deliverMock).toHaveBeenCalledWith(
      db,
      "user-1",
      expect.objectContaining({
        category: "daily_digest",
        title: "Daily summary",
        body: "8,420 steps today · Recovery 82.",
      }),
      { requireLive: true },
    );
  });
});
