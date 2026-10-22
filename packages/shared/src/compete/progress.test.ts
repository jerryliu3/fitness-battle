import { formatEffort } from "./engine";
import { describe, expect, it } from "vitest";
import { freshState } from "./engine";
import {
  personalRecordHistory,
  personalRecordChart,
  recordAttemptsForActivity,
  weeklyTraining,
  recordStepPath,
} from "./progress";
import type { Activity } from "./sports";
const now = new Date("2026-11-03T12:00:00Z");
const run = (
  id: string,
  date: string,
  seconds = 1500,
  distance = 5000,
): Activity => ({
  id,
  sport: "running",
  startedAt: date,
  distanceM: distance,
  movingSec: seconds,
  avgHr: null,
  source: "strava",
  verified: true,
  provenance: "recorded",
});
describe("progress history", () => {
  it("keeps dated improvements only, without inventing splits", () => {
    const s = {
      ...freshState(now),
      activities: [
        run("a", "2026-10-01T12:00:00Z", 1600),
        run("b", "2026-10-02T12:00:00Z", 1700),
        run("c", "2026-10-03T12:00:00Z", 1500),
        run("long", "2026-10-04T12:00:00Z", 1400, 15000),
      ],
    };
    expect(personalRecordHistory(s, now).map((r) => r.activityId)).toEqual([
      "a",
      "c",
    ]);
    expect(recordStepPath(personalRecordHistory(s, now))).toContain(
      "H 292 V 8",
    );
  });
  it("retains durable old receipts beyond the loaded activity window", () => {
    const a = run("old", "2025-01-01T12:00:00Z");
    const s = {
      ...freshState(now),
      recordAttempts: recordAttemptsForActivity(a, now),
    };
    expect(personalRecordHistory(s, now)).toHaveLength(1);
    expect(
      personalRecordHistory(
        { ...s, activities: [{ ...a, disposition: "excluded" }] },
        now,
      ),
    ).toHaveLength(0);
  });
  it("supports all requested cycling distances, excludes samples and future sessions", () => {
    for (const d of [50000, 100000, 150000, 180000])
      expect(
        recordAttemptsForActivity(
          { ...run("ride", "2026-10-01T12:00:00Z", 7200, d), sport: "cycling" },
          now,
        ),
      ).toHaveLength(1);
    expect(
      recordAttemptsForActivity(
        { ...run("sample", "2026-10-01T12:00:00Z"), provenance: "demo" },
        now,
      ),
    ).toHaveLength(0);
    expect(
      recordAttemptsForActivity(run("future", "2026-12-01T12:00:00Z"), now),
    ).toHaveLength(0);
  });
  it("uses Eastern half-open weeks across DST and labels partial weeks", () => {
    const weeks = weeklyTraining(
      [
        run("before", "2026-11-02T04:59:59Z"),
        run("after", "2026-11-02T05:00:00Z"),
      ],
      "running",
      now,
      2,
    );
    expect(weeks.map((w) => w.sessions)).toEqual([1, 1]);
    expect(weeks[0]!.start).toBe("2026-10-26T04:00:00.000Z");
    expect(weeks[0]!.end).toBe("2026-11-02T05:00:00.000Z");
    expect(weeks.map((w) => w.partial)).toEqual([false, true]);
  });
});

it("renders a real standing line for one record and descending dated improvements", () => {
  const a = recordAttemptsForActivity(
    run("first", "2026-10-01T12:00:00Z", 1600),
    now,
  )[0]!;
  const single = personalRecordChart([a], now)!;
  expect(single.points).toHaveLength(1);
  expect(single.path).toContain(" H 326");
  const b = {
    ...a,
    activityId: "second",
    startedAt: "2026-10-20T12:00:00Z",
    seconds: 1500,
  };
  const chart = personalRecordChart([a, b], now)!;
  expect(chart.points[1]!.x).toBeGreaterThan(chart.points[0]!.x);
  expect(chart.points[1]!.y).toBeGreaterThan(chart.points[0]!.y);
  expect(chart.points.map((p) => p.seconds)).toEqual([1600, 1500]);
});

it("formats large effort scores without raw decimals", () => {
  expect(formatEffort(54000)).toBe("54,000");
  expect(formatEffort(1400.55)).toBe("1,400.6");
});
