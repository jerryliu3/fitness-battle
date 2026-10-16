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

function mockHealthModule() {
  return {
    initialize: vi.fn(async () => true),
    requestPermission: vi.fn(async () => undefined),
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
    expect(result.message).toMatch(/demo/i);
    expect(fetchFn).not.toHaveBeenCalled();
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
});
