import { expect, it } from "vitest";
import { freshState } from "./compete/engine";
import { benchmarkBars, homeTrainingLine, openLineModel } from "./chart-presentation";
import { weeklyHoursComparison } from "./week-chart";
import { effortHistory } from "./effort-history";
import { trainingBuckets } from "./training-view";

it("preserves this week's counted totals and stops the line at today", () => {
  const now = new Date("2026-10-22T16:00:00Z"), state = freshState(now);
  state.activities = [
    { id: "previous", startedAt: "2026-10-15T12:00:00Z", movingSec: 7200 },
    { id: "current", startedAt: "2026-10-22T12:00:00Z", movingSec: 3600 },
    { id: "sample", startedAt: "2026-10-22T12:00:00Z", movingSec: 36000, provenance: "demo" },
    { id: "future", startedAt: "2026-10-23T12:00:00Z", movingSec: 36000 },
  ].map(row => ({ sport: "running", source: "strava", provenance: "recorded", disposition: "counted", verified: true, distanceM: 1000, avgHr: null, ...row })) as typeof state.activities;
  const model = homeTrainingLine(state, "week", now);
  expect(model.value).toBe(weeklyHoursComparison(state, now).currTotalHours.toFixed(1));
  expect(model.points).toHaveLength(4);
  expect(model.points.at(-1)?.id).toBe("2026-10-22");
  expect(model.previous.split(" ")).toHaveLength(7);
  expect(model.points.at(-1)!.x).toBeLessThan(336);
  expect(model.line).not.toMatch(/NaN|Infinity/);
});

it("uses 28 Eastern calendar days across DST and keeps comparison windows disjoint", () => {
  const now = new Date("2026-11-05T17:00:00Z"), state = freshState(now);
  state.activities = [
    { id: "prior-end", startedAt: "2026-10-12T03:59:59Z", movingSec: 7200 },
    { id: "current-start", startedAt: "2026-10-12T04:00:00Z", movingSec: 3600 },
    { id: "dst", startedAt: "2026-11-01T06:30:00Z", movingSec: 3600 },
  ].map(row => ({ sport: "running", source: "strava", provenance: "recorded", disposition: "counted", verified: true, distanceM: 1000, avgHr: null, ...row })) as typeof state.activities;
  const model = homeTrainingLine(state, "fourWeeks", now);
  expect(model.points[0]?.id).toBe("2026-10-12");
  expect(model.points).toHaveLength(25);
  expect(new Set(model.points.map(point => point.id)).size).toBe(25);
  expect(model.value).toBe("2.0");
  expect(model.previous.split(" ")).toHaveLength(28);
  expect(model.points.at(-1)?.id).toBe("2026-11-05");
});

it("keeps score histories readable and provides a real four-week effort range", () => {
  const history = effortHistory(freshState(), "open", null, null, "fourWeeks");
  expect(history.dailyValues).toHaveLength(28);
  const flat = openLineModel(history.pts.map((point, i) => ({ id: point.date, date: point.date, value: history.dailyValues[i]! })), String);
  expect(flat.line).not.toMatch(/NaN|Infinity/);
  expect(flat.points[0]!.y).toBe((flat.top + flat.bottom) / 2);
  expect(openLineModel([], String).points).toEqual([]);
  const year = openLineModel([{ id: "old", date: "2025-11-06T12:00:00Z", value: 1000 }, { id: "now", date: "2026-10-29T12:00:00Z", value: 1100 }], String);
  expect(year.points[0]!.label).toBe("Nov 6, 2025");
  expect(year.points[1]!.label).toBe("Oct 29, 2026");
});

it("includes recorded zero buckets in the benchmark average and excludes future days", () => {
  const now = new Date("2026-10-20T16:00:00Z");
  const buckets = trainingBuckets([], "all", "week", now, now);
  buckets[0]!.movingSec = 3600;
  const chart = benchmarkBars(buckets, now);
  expect(chart.average).toBe(1800);
  expect(chart.points).toHaveLength(2);
  expect(chart.points[1]?.value).toBe("0.0");
  expect(chart.points[1]?.y).toBe(chart.bottom);
  expect(chart.bars.filter(bar => bar.future)).toHaveLength(5);
  expect(chart.averageY).toBeLessThan(chart.bottom);
});
