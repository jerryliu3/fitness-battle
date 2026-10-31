import { describe, expect, it } from "vitest";
import { appleHealthExtra, appleSleepNights, androidHealthExtra, unionTimeRanges } from "./device-health-metrics";

describe("device health metrics", () => {
  it("unions duplicate sleep intervals and excludes in-bed time", () => {
    const samples = [
      { value: "ASLEEP_CORE", startDate: "2026-10-30T02:00:00Z", endDate: "2026-10-30T09:00:00Z", sourceId: "watch" },
      { value: "ASLEEP", startDate: "2026-10-30T02:00:00Z", endDate: "2026-10-30T09:00:00Z", sourceId: "watch" },
      { value: "INBED", startDate: "2026-10-30T01:00:00Z", endDate: "2026-10-30T10:00:00Z" },
    ];
    expect(appleSleepNights(samples)).toMatchObject([{ day: "2026-10-30", durationMin: 420, lightMin: 420 }]);
  });

  it("calculates union of discontinuous time ranges accurately", () => {
    expect(unionTimeRanges([[100, 200], [150, 250], [300, 400]])).toBe(250);
  });

  it("merges daily metrics for the same calendar date into a single record", async () => {
    const mockNative = {
      getDailyStepCountSamples: (_options: unknown, cb: Function) =>
        cb(null, [{ value: 7500, startDate: "2026-10-30T10:00:00Z" }]),
      getRestingHeartRateSamples: (_options: unknown, cb: Function) =>
        cb(null, [{ value: 54, startDate: "2026-10-30T10:00:00Z" }]),
      getHeartRateVariabilitySamples: (_options: unknown, cb: Function) =>
        cb(null, [{ value: 0.048, startDate: "2026-10-30T10:00:00Z" }]),
      getSleepSamples: (_options: unknown, cb: Function) => cb(null, []),
    };
    const result = await appleHealthExtra(mockNative, "2026-10-29", "2026-10-31");
    expect(result.dailyHealth).toEqual([
      { provider: "apple_health", day: "2026-10-30", steps: 7500, restingHr: 54, hrv: 48 },
    ]);
  });

  it("converts HealthKit HRV seconds to milliseconds without fabricating other metrics", async () => {
    const result = await appleHealthExtra(
      {
        getHeartRateVariabilitySamples: (_options: unknown, callback: Function) =>
          callback(null, [{ value: 0.05, startDate: "2026-10-30T12:00:00Z" }]),
      },
      "2026-10-29",
      "2026-10-31",
    );
    expect(result.dailyHealth).toEqual([{ provider: "apple_health", day: "2026-10-30", hrv: 50 }]);
  });

  it("does not query ungranted Android health metrics", async () => {
    const result = await androidHealthExtra({ requestPermission: async () => [] });
    expect(result.dailyHealth.every((r) => r.steps == null && r.restingHr == null && r.hrv == null)).toBe(true);
    expect(result.sleepNights).toEqual([]);
  });

  it("records Android sleep sessions without granular stage breakdowns", async () => {
    const mockNative = {
      readRecords: async (type: string) => {
        if (type === "SleepSession") {
          return {
            records: [
              {
                startTime: "2026-10-30T00:00:00Z",
                endTime: "2026-10-30T07:30:00Z",
                stages: [],
              },
            ],
          };
        }
        return { records: [] };
      },
    };
    const result = await androidHealthExtra(mockNative, [
      { recordType: "SleepSession", accessType: "read" },
    ]);
    expect(result.sleepNights).toMatchObject([
      { source: "google_health", day: "2026-10-30", durationMin: 450 },
    ]);
  });
});
