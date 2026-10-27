import { describe, expect, it } from "vitest";
import { activityComparisons } from "./activity-comparison";
import type { Activity } from "./compete/sports";

const targetTime = Date.parse("2026-10-26T11:00:00Z");
const day = 86400000;
const now = new Date(targetTime + day);
function activity(id: string, daysBefore: number, extra: Partial<Activity> = {}): Activity {
  return { id, sport: "running", startedAt: new Date(targetTime - daysBefore * day).toISOString(), distanceM: 5000, movingSec: 1800, avgHr: null, source: "manual", verified: false, ...extra };
}

describe("activity comparisons", () => {
  it("compares a session to prior counted same-sport medians, excluding the target and later data", () => {
    const target = activity("target", 0, { movingSec: 2400, distanceM: 5000 });
    const rows = [target, activity("a", 1, { movingSec: 1800 }), activity("b", 2, { movingSec: 2100 }), activity("c", 3, { movingSec: 2400 }),
      activity("later", -1, { movingSec: 20 }), activity("other", 1, { sport: "cycling", movingSec: 20 }),
      activity("excluded", 1, { movingSec: 20, disposition: "excluded" }), activity("pending", 1, { disposition: "pending" }),
      activity("sample", 1, { provenance: "demo" }), activity("bad", 1, { movingSec: 0 })];
    const result = activityComparisons(target, rows, "metric", now);
    expect(result.map(x => x.id)).toEqual(["time", "distance", "pace"]);
    expect(result[0]).toMatchObject({ currentLabel: "40:00", baselineLabel: "35:00", baseline: 2100 });
    expect(result[1]).toMatchObject({ currentLabel: "5.0 km", baselineLabel: "5.0 km" });
    expect(result[2]).toMatchObject({ currentLabel: "8:00/km", baselineLabel: "7:00/km" });
    expect(result[2]!.context).toContain("within 20% of this distance");
  });

  it("requires enough comparable-distance workouts and respects unit preferences", () => {
    const target = activity("target", 0);
    const rows = [activity("a", 1), activity("b", 2), activity("c", 3, { distanceM: 9000 })];
    const result = activityComparisons(target, rows, "us", now);
    expect(result.map(x => x.id)).toEqual(["time", "distance"]);
    expect(result[1]!.currentLabel).toBe("3.1 mi");
    expect(activityComparisons(target, rows.slice(0, 2), "us", now)).toEqual([]);
  });

  it("compares strength frequency and optional recorded heart rate without fabricating sensor data", () => {
    const target = activity("target", 0, { sport: "strength", distanceM: 0, avgHr: 130 });
    const prior = [activity("a", 5, { sport: "strength", avgHr: 110 }), activity("b", 30, { sport: "strength", avgHr: 120 }), activity("c", 31, { sport: "strength", avgHr: 140 }), activity("d", 61, { sport: "strength", avgHr: 500 })];
    const result = activityComparisons(target, [target, ...prior], "us", now);
    expect(result.map(x => x.id)).toEqual(["time", "frequency", "heart-rate"]);
    expect(result[1]).toMatchObject({ current: 3, baseline: 1, currentLabel: "3", baselineLabel: "1" });
    expect(result[2]).toMatchObject({ currentLabel: "130 bpm", baselineLabel: "120 bpm" });
    expect(activityComparisons({ ...target, avgHr: null }, prior, "us", now).map(x => x.id)).toEqual(["time", "frequency"]);
  });

  it("limits the baseline to the latest ten and does not compare sample, excluded or future targets", () => {
    const target = activity("target", 0);
    const prior = Array.from({ length: 15 }, (_, index) => activity(`s${index}`, index + 1, { movingSec: 600 + index * 60 }));
    const result = activityComparisons(target, prior, "metric", now);
    expect(result[0]!.baseline).toBe(870);
    expect(result[0]!.context).toContain("10 previous");
    expect(activityComparisons({ ...target, disposition: "excluded" }, prior, "metric", now)).toEqual([]);
    expect(activityComparisons({ ...target, provenance: "demo" }, prior, "metric", now)).toEqual([]);
    expect(activityComparisons(activity("future", -3), prior, "metric", now)).toEqual([]);
  });
});
