import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  defineTask: vi.fn(),
  isTaskDefined: vi.fn(() => true),
  isTaskRegisteredAsync: vi.fn(),
  registerTaskAsync: vi.fn(),
  unregisterTaskAsync: vi.fn(),
  getStatusAsync: vi.fn(),
  getSession: vi.fn(),
  syncAppleHealth: vi.fn(),
  syncHealthConnect: vi.fn(),
  platformOs: "ios" as "ios" | "android" | "web",
}));

vi.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mocks.platformOs;
    },
  },
}));

vi.mock("expo-task-manager", () => ({
  defineTask: mocks.defineTask,
  isTaskDefined: mocks.isTaskDefined,
  isTaskRegisteredAsync: mocks.isTaskRegisteredAsync,
}));

vi.mock("expo-background-fetch", () => ({
  BackgroundFetchStatus: {
    Restricted: 1,
    Denied: 2,
    Available: 3,
  },
  BackgroundFetchResult: {
    NoData: 1,
    NewData: 2,
    Failed: 3,
  },
  getStatusAsync: mocks.getStatusAsync,
  registerTaskAsync: mocks.registerTaskAsync,
  unregisterTaskAsync: mocks.unregisterTaskAsync,
}));

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
    },
  },
}));

vi.mock("./device-health", () => ({
  syncAppleHealth: mocks.syncAppleHealth,
  syncHealthConnect: mocks.syncHealthConnect,
}));

import {
  BACKGROUND_HEALTH_SYNC_TASK,
  registerBackgroundHealthSync,
  runBackgroundHealthSyncTask,
} from "./background-health-sync";

describe("background-health-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.platformOs = "ios";
    mocks.getStatusAsync.mockResolvedValue(3);
    mocks.isTaskRegisteredAsync.mockResolvedValue(false);
    mocks.registerTaskAsync.mockResolvedValue(undefined);
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });
    mocks.syncAppleHealth.mockResolvedValue({ ok: true, count: 2 });
    mocks.syncHealthConnect.mockResolvedValue({ ok: true, count: 1 });
  });

  it("registers the background task on iOS when available", async () => {
    const ok = await registerBackgroundHealthSync();
    expect(ok).toBe(true);
    expect(mocks.registerTaskAsync).toHaveBeenCalledWith(
      BACKGROUND_HEALTH_SYNC_TASK,
      expect.objectContaining({
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      }),
    );
  });

  it("skips registration on web", async () => {
    mocks.platformOs = "web";
    const ok = await registerBackgroundHealthSync();
    expect(ok).toBe(false);
    expect(mocks.registerTaskAsync).not.toHaveBeenCalled();
  });

  it("returns NoData when signed out", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    const result = await runBackgroundHealthSyncTask();
    expect(result).toBe(1); // NoData
    expect(mocks.syncAppleHealth).not.toHaveBeenCalled();
  });

  it("runs Apple Health on iOS and Health Connect on Android", async () => {
    expect(await runBackgroundHealthSyncTask()).toBe(2); // NewData
    expect(mocks.syncAppleHealth).toHaveBeenCalledTimes(1);

    mocks.platformOs = "android";
    expect(await runBackgroundHealthSyncTask()).toBe(2); // NewData
    expect(mocks.syncHealthConnect).toHaveBeenCalledTimes(1);
  });
});
