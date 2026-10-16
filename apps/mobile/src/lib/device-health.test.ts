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

import { packageExportMissingNativeMethods } from "./apple-health-kit";
import { sampleFromWorkout, syncAppleHealth, type SyncAppleHealthDeps } from "./device-health";

const brokenPackageExport = {
  Constants: { Permissions: { Workout: "Workout" } },
  initHealthKit: undefined,
  getAnchoredWorkouts: undefined,
};

function testDeps(
  overrides: Partial<SyncAppleHealthDeps> & {
    workouts?: Array<{
      id: string;
      activityName: string;
      start: string;
      end: string;
      distance: number;
      duration: number;
    }>;
    initError?: string;
  } = {},
): SyncAppleHealthDeps {
  const { workouts = [], initError, ...depOverrides } = overrides;

  const initHealthKit = vi.fn((_: unknown, cb: (error: string) => void) => {
    cb(initError ?? "");
  });
  const getAnchoredWorkouts = vi.fn(
    (
      options: { startDate: string; endDate?: string; type?: string },
      cb: (error: null, results: { data: unknown[] }) => void,
    ) => {
      expect(options.type).toBe("Workout");
      expect(options.endDate).toBeTruthy();
      cb(null, { data: workouts });
    },
  );

  return {
    platform: "ios",
    // New Architecture shape: package export has Constants only.
    packageExport: brokenPackageExport,
    nativeModule: { initHealthKit, getAnchoredWorkouts },
    apiUrl: "https://example.test",
    getAccessToken: async () => ({ token: "token", userId: "user-1" }),
    fetchFn: vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    })) as unknown as typeof fetch,
    ...depOverrides,
  };
}

describe("syncAppleHealth", () => {
  it("reproduces the TestFlight failure mode on the package export", () => {
    expect(packageExportMissingNativeMethods(brokenPackageExport)).toBe(true);
    expect(typeof brokenPackageExport.initHealthKit).not.toBe("function");
  });

  it("syncs via NativeModules even when react-native-health export has no methods", async () => {
    const deps = testDeps({
      workouts: [
        {
          id: "hk-1",
          activityName: "Running",
          start: "2026-10-01T12:00:00.000Z",
          end: "2026-10-01T12:30:00.000Z",
          distance: 3.1,
          duration: 1800,
        },
      ],
    });

    const result = await syncAppleHealth(deps);

    expect(result.ok).toBe(true);
    expect(result.count).toBe(1);
    expect(result.message).toMatch(/Sent 1/);
    expect(deps.nativeModule?.initHealthKit).toHaveBeenCalledOnce();
    expect(deps.nativeModule?.getAnchoredWorkouts).toHaveBeenCalledOnce();
    expect(deps.fetchFn).toHaveBeenCalledWith(
      "https://example.test/api/fitness/ingest",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token",
        }),
      }),
    );
  });

  it("maps Apple Health miles to meters for ingest", async () => {
    const deps = testDeps({
      workouts: [
        {
          id: "hk-2",
          activityName: "Running",
          start: "2026-10-01T12:00:00.000Z",
          end: "2026-10-01T12:30:00.000Z",
          distance: 1,
          duration: 600,
        },
      ],
    });

    await syncAppleHealth(deps);

    const call = (deps.fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(String(call?.[1]?.body)) as {
      activities: { metricValue: number; categorySlug: string }[];
    };
    expect(body.activities[0]?.categorySlug).toBe("running");
    expect(body.activities[0]?.metricValue).toBeCloseTo(1609.344, 3);
  });

  it("returns a clear error instead of throwing when HealthKit denies permission", async () => {
    const deps = testDeps({ initError: "Permission denied" });
    const result = await syncAppleHealth(deps);
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Permission denied");
    expect(deps.nativeModule?.getAnchoredWorkouts).not.toHaveBeenCalled();
  });

  it("returns unsupported off iOS", async () => {
    const result = await syncAppleHealth(testDeps({ platform: "android" }));
    expect(result).toEqual({
      ok: false,
      message: "Apple Health is only available on iOS.",
      count: 0,
    });
  });

  it("marks authorized and asks for sign-in when there is no access token", async () => {
    const deps = testDeps({
      workouts: [
        {
          id: "hk-3",
          activityName: "Running",
          start: "2026-10-01T12:00:00.000Z",
          end: "2026-10-01T12:30:00.000Z",
          distance: 1,
          duration: 600,
        },
      ],
      getAccessToken: async () => ({}),
    });
    const result = await syncAppleHealth(deps);
    expect(result.ok).toBe(false);
    expect(result.authorized).toBe(true);
    expect(result.message).toMatch(/sign in/i);
    expect(deps.fetchFn).not.toHaveBeenCalled();
  });

  it("marks authorized with zero workouts after HealthKit permission", async () => {
    const deps = testDeps({ workouts: [] });
    const result = await syncAppleHealth(deps);
    expect(result).toMatchObject({
      ok: true,
      authorized: true,
      count: 0,
    });
    expect(result.message).toMatch(/connected/i);
    expect(deps.fetchFn).not.toHaveBeenCalled();
  });

  it("surfaces a clear message when ingest fetch fails", async () => {
    const deps = testDeps({
      workouts: [
        {
          id: "hk-4",
          activityName: "Running",
          start: "2026-10-01T12:00:00.000Z",
          end: "2026-10-01T12:30:00.000Z",
          distance: 1,
          duration: 600,
        },
      ],
      fetchFn: vi.fn(async () => {
        throw new Error("Network request failed");
      }) as unknown as typeof fetch,
    });
    const result = await syncAppleHealth(deps);
    expect(result.ok).toBe(false);
    expect(result.authorized).toBe(true);
    expect(result.message).toMatch(/could not reach the server/i);
  });

  it("keeps demo/local-only syncs on-device without calling ingest", async () => {
    const deps = testDeps({
      localOnly: true,
      workouts: [
        {
          id: "hk-5",
          activityName: "Running",
          start: "2026-10-01T12:00:00.000Z",
          end: "2026-10-01T12:30:00.000Z",
          distance: 1,
          duration: 600,
        },
      ],
    });
    const result = await syncAppleHealth(deps);
    expect(result.ok).toBe(true);
    expect(result.authorized).toBe(true);
    expect(result.count).toBe(1);
    expect(result.message).toMatch(/demo/i);
    expect(deps.fetchFn).not.toHaveBeenCalled();
  });
});

describe("sampleFromWorkout", () => {
  it("maps HealthKit strength workouts by activity name", () => {
    const sample = sampleFromWorkout(
      "apple_health",
      {
        id: "s1",
        start: "2026-10-01T12:00:00.000Z",
        end: "2026-10-01T12:45:00.000Z",
        duration: 2700,
        distance: 0,
      },
      "TraditionalStrengthTraining",
    );
    expect(sample?.categorySlug).toBe("strength");
    expect(sample?.metricValue).toBe(2700);
  });
});
