import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getConnection: vi.fn(),
  syncActivities: vi.fn(),
  setConnection: vi.fn(),
  window: vi.fn(),
  persistActivities: vi.fn(),
  persistDailyHealth: vi.fn(),
  persistSleepNight: vi.fn(),
  persistReadiness: vi.fn(),
  serviceDb: vi.fn(),
}));

vi.mock("@/lib/fitness", () => ({
  getServerFitnessProvider: () => ({
    getConnection: mocks.getConnection,
    syncActivities: mocks.syncActivities,
  }),
}));

vi.mock("@/lib/fitness-history", () => ({
  fitnessSyncWindow: mocks.window,
}));

vi.mock("@/lib/fitness-store", () => ({
  createProviderStore: () => ({ setConnection: mocks.setConnection }),
  persistSyncedActivities: mocks.persistActivities,
  persistReadiness: mocks.persistReadiness,
  serviceDb: mocks.serviceDb,
}));

vi.mock("@/lib/daily-health-store", () => ({
  persistDailyHealth: mocks.persistDailyHealth,
}));

vi.mock("@/lib/garmin-record-store", () => ({
  persistSleepNight: mocks.persistSleepNight,
}));

import {
  runBackgroundProviderSync,
  syncConnectedProviderForUser,
} from "./background-fitness-sync";

describe("background-fitness-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConnection.mockResolvedValue({ status: "connected" });
    mocks.window.mockResolvedValue({ since: "2026-11-22T00:00:00Z" });
    mocks.syncActivities.mockResolvedValue({
      activities: [{ id: "a1" }],
      readiness: [{ externalId: "r1" }],
      sleepNights: [{ externalId: "s1" }],
      dailyHealth: [{ day: "2026-11-23" }],
      usedMock: false,
    });
    mocks.persistActivities.mockResolvedValue(true);
    mocks.persistDailyHealth.mockResolvedValue(undefined);
    mocks.persistSleepNight.mockResolvedValue(undefined);
    mocks.persistReadiness.mockResolvedValue(true);
  });

  it("syncs and persists activities, daily health, sleep, and readiness", async () => {
    const outcome = await syncConnectedProviderForUser("user-1", "oura");
    expect(outcome).toEqual({
      ok: true,
      activities: 1,
      readiness: 1,
      sleepNights: 1,
      dailyHealth: 1,
    });
    expect(mocks.persistActivities).toHaveBeenCalledWith("user-1", [{ id: "a1" }]);
    expect(mocks.persistDailyHealth).toHaveBeenCalledWith("user-1", [{ day: "2026-11-23" }]);
    expect(mocks.persistSleepNight).toHaveBeenCalledWith("user-1", { externalId: "s1" });
    expect(mocks.persistReadiness).toHaveBeenCalledWith("user-1", [{ externalId: "r1" }]);
  });

  it("runs across all connected strava/oura/whoop rows", async () => {
    mocks.serviceDb.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            in: () => ({
              order: async () => ({
                data: [
                  { user_id: "user-1", provider: "strava" },
                  { user_id: "user-2", provider: "whoop" },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const summary = await runBackgroundProviderSync();
    expect(summary).toEqual({
      attempted: 2,
      synced: 2,
      failed: 0,
      activities: 2,
    });
  });
});
