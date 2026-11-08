import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  NativeModules: {},
}));

vi.mock("./env", () => ({
  mobileEnv: { apiUrl: "https://example.test" },
}));

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
    },
  },
}));

import { createHealthConnectDeps, syncHealthConnect } from "./device-health";

function mockHealthModule(
  overrides: {
    granted?: { accessType: string; recordType: string }[];
  } = {},
) {
  const granted = overrides.granted ?? [
    { accessType: "read", recordType: "ExerciseSession" },
    { accessType: "read", recordType: "Distance" },
  ];
  return {
    initialize: vi.fn(async () => true),
    requestPermission: vi.fn(async () => granted),
    readRecords: vi.fn(async (type: string) => {
      if (type === "ExerciseSession") {
        return {
          records: [
            {
              metadata: { id: "hc-1" },
              startTime: "2026-10-01T12:00:00.000Z",
              endTime: "2026-10-01T12:30:00.000Z",
              title: "Run",
              exerciseType: 56,
            },
          ],
        };
      }
      return {
        records: [
          {
            startTime: "2026-10-01T12:05:00.000Z",
            distance: { inMeters: 5000 },
          },
        ],
      };
    }),
    ExerciseType: { RUNNING: 56 },
  };
}

describe("syncHealthConnect", () => {
  it("keeps demo/local-only syncs on-device without calling ingest", async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    const result = await syncHealthConnect(
      createHealthConnectDeps({
        platform: "android",
        localOnly: true,
        fetchFn,
        getAccessToken: async () => ({}),
        healthModule: mockHealthModule(),
      }),
    );
    expect(result).toMatchObject({ ok: true, authorized: true, count: 1 });
    expect(result.message).toMatch(/connected/i);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("does not mark connected when ExerciseSession read is denied", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const result = await syncHealthConnect(
      createHealthConnectDeps({
        platform: "android",
        fetchFn,
        healthModule: mockHealthModule({ granted: [] }),
      }),
    );
    expect(result).toEqual({
      ok: false,
      authorized: false,
      message: "Health Connect permission was not granted. Allow workout access and try again.",
      count: 0,
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("returns a denial result when the permission request throws", async () => {
    const health = mockHealthModule();
    health.requestPermission.mockRejectedValue(new Error("User denied"));
    const result = await syncHealthConnect(
      createHealthConnectDeps({
        platform: "android",
        healthModule: health,
      }),
    );
    expect(result).toEqual({
      ok: false,
      authorized: false,
      message: "Health Connect permission was not granted. Allow workout access and try again.",
      count: 0,
    });
  });

  it("uploads with the caller-provided bearer token", async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    const result = await syncHealthConnect(
      createHealthConnectDeps({
        platform: "android",
        fetchFn,
        getAccessToken: async () => ({ token: "live-token", userId: "user-2" }),
        healthModule: mockHealthModule(),
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.count).toBe(1);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://example.test/api/fitness/ingest",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer live-token",
        }),
      }),
    );
  });

  it("uses incremental cursor and deduplicates duplicate Health Connect sessions", async () => {
    const store = new Map<string, string>();
    const cursorStore = {
      getItem: vi.fn(async (key: string) => store.get(key) ?? null),
      setItem: vi.fn(async (key: string, val: string) => {
        store.set(key, val);
      }),
    };
    const health = mockHealthModule();
    health.readRecords = vi.fn(async (type: string) => {
      if (type === "ExerciseSession") {
        return {
          records: [
            {
              metadata: { id: "hc-1" },
              startTime: "2026-10-01T12:00:00.000Z",
              endTime: "2026-10-01T12:30:00.000Z",
              title: "Run",
              exerciseType: 56,
            },
            {
              metadata: { id: "hc-2" },
              startTime: "2026-10-01T12:00:10.000Z",
              endTime: "2026-10-01T12:30:10.000Z",
              title: "Run",
              exerciseType: 56,
            },
          ],
        };
      }
      return {
        records: [
          {
            startTime: "2026-10-01T12:05:00.000Z",
            distance: { inMeters: 5000 },
          },
        ],
      };
    });
    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    const recentSync = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const result = await syncHealthConnect(
      createHealthConnectDeps({
        platform: "android",
        fetchFn,
        lastSyncAt: recentSync,
        cursorStore,
        getAccessToken: async () => ({ token: "live-token", userId: "user-2" }),
        healthModule: health,
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.count).toBe(1);
    expect(result.activities?.map((a) => a.externalId)).toEqual(["hc-1"]);
    const rangeArg = (health.readRecords as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as {
      timeRangeFilter: { startTime: string };
    };
    expect(Date.parse(rangeArg.timeRangeFilter.startTime)).toBeGreaterThan(
      Date.now() - 5 * 86_400_000,
    );
    expect(cursorStore.setItem).toHaveBeenCalledWith(
      "device-sync-cursor:google_health:user-2",
      expect.any(String),
    );
  });
});
