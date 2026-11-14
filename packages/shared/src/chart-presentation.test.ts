import { expect, it } from "vitest";
import { freshState } from "./compete/engine";
import { benchmarkBars, homeTrainingLine, openLineModel, effortScoreLine, effortScoreComparison } from "./chart-presentation";
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
  expect(model.points.map(point => point.id)).toEqual([expect.stringContaining("start:"), "current", expect.stringContaining("end:")]);
  expect(model.points.at(-1)?.label).toContain("Oct 22");
  expect(model.previous).toBe("");
  expect(model.trendLine).not.toBe("");
  expect(model.points.at(-1)!.x).toBeLessThan(336);
  expect(model.line).not.toMatch(/NaN|Infinity/);
});

it("uses 28 Eastern calendar days across DST without a previous comparison line", () => {
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
  expect(model.previous).toBe("");
  expect(model.trendLine).not.toBe("");
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

it("plots each same-day Home activity at its Eastern timestamp, with flat gaps", () => {
  const now = new Date("2026-10-22T22:00:00Z"), state = freshState(now);
  state.activities = [
    { id: "late", startedAt: "2026-10-22T20:00:00Z", movingSec: 1800 },
    { id: "early", startedAt: "2026-10-22T12:00:00Z", movingSec: 3600 },
    { id: "excluded", startedAt: "2026-10-22T14:00:00Z", movingSec: 7200, disposition: "excluded" },
    { id: "zero", startedAt: "2026-10-22T15:00:00Z", movingSec: 0 },
  ].map(row => ({ sport: "running", source: "strava", provenance: "recorded", disposition: "counted", verified: true, distanceM: 1000, avgHr: null, ...row })) as typeof state.activities;
  const chart = homeTrainingLine(state, "week", now);
  const early = chart.points.find(point => point.id === "early")!, late = chart.points.find(point => point.id === "late")!;
  expect(chart.points.map(point => point.id)).toEqual([expect.stringContaining("start:"), "early", "late", expect.stringContaining("end:")]);
  expect(early.value).toBe("1.0");
  expect(late.value).toBe("1.5");
  expect(late.x - early.x).toBeCloseTo((chart.right - chart.left) / 7 / 3);
  expect(early.label).toContain("8:00 AM");
  expect(late.label).toContain("4:00 PM");
  const line = chart.line.split(" ").map(pair => pair.split(",").map(Number));
  expect(line[3]![1]).toBe(line[2]![1]); // carry early's value until late's timestamp
});

it("keeps equal day spacing through DST and distinct repeated-hour events", () => {
  const start = new Date("2026-10-31T04:00:00Z"), end = new Date("2026-11-03T05:00:00Z");
  const chart = openLineModel([
    { id: "sat", date: "2026-10-31T04:00:00Z", value: 0 },
    { id: "sun", date: "2026-11-01T04:00:00Z", value: 1 },
    { id: "first-1am", date: "2026-11-01T05:30:00Z", value: 2 },
    { id: "second-1am", date: "2026-11-01T06:30:00Z", value: 3 },
    { id: "mon", date: "2026-11-02T05:00:00Z", value: 4 },
  ], String, [], 3, { start, end, showTime: true });
  expect(chart.points[1]!.x - chart.points[0]!.x).toBeCloseTo(chart.points[4]!.x - chart.points[1]!.x);
  expect(chart.points[2]!.x).toBeLessThan(chart.points[3]!.x);
  expect(chart.points[2]!.label).toContain("EDT");
  expect(chart.points[3]!.label).toContain("EST");
});

it("uses 84 and 168 Eastern days for 12-week and 24-week effort histories", () => {
  const now = new Date("2026-11-10T17:00:00Z"), state = freshState(now);
  state.ratings[0]!.openElo = 1100;
  state.effortScoreEvents = [
    { id: "near", sport: "running", track: "open", occurredAt: "2026-10-01T12:00:00Z", scoreBefore: 1000, scoreAfter: 1080 },
    { id: "far", sport: "running", track: "open", occurredAt: "2026-07-01T12:00:00Z", scoreBefore: 900, scoreAfter: 950 },
  ];
  expect(effortScoreLine(state, "open", "twelveWeeks", now).points.some(p => p.id === "near")).toBe(true);
  expect(effortScoreLine(state, "open", "twelveWeeks", now).points.some(p => p.id === "far")).toBe(false);
  expect(effortScoreLine(state, "open", "twentyFourWeeks", now).points.some(p => p.id === "far")).toBe(true);
  expect(effortScoreLine(state, "open", "year", now).date).not.toBe(effortScoreLine(state, "open", "twelveWeeks", now).date);
});

it("compares the current score to the recorded score at the start of the window", () => {
  const now = new Date("2026-11-10T17:00:00Z"), state = freshState(now);
  expect(effortScoreComparison(state, "open", "fourWeeks", now)).toBeNull();
  state.ratings[0]!.openElo = 1100;
  state.effortScoreEvents = [
    { id: "start", sport: "running", track: "open", occurredAt: "2026-10-01T12:00:00Z", scoreBefore: 1000, scoreAfter: 1000 },
    { id: "now", sport: "running", track: "open", occurredAt: "2026-11-09T12:00:00Z", scoreBefore: 1000, scoreAfter: 1100 },
  ];
  const comparison = effortScoreComparison(state, "open", "fourWeeks", now);
  expect(comparison?.prior).toBe(1000);
  expect(comparison?.current).toBe(1100);
  expect(comparison?.pct).toBe(10);
});

it("shows every recorded score change, filters sport/track/future, and never reconstructs milestone dates", () => {
  const now = new Date("2026-10-22T22:00:00Z"), state = freshState(now);
  state.ratings[0]!.openElo = 1002;
  state.effortMilestones = [{ sport: "running", track: "open", periodStart: "2026-10-19T04:00:00Z", periodEnd: "2026-10-26T04:00:00Z", step: 1609.344, earned: 2 }];
  expect(effortScoreLine(state, "open", "week", now).points.map(p => p.id)).toEqual(["current"]);
  state.effortScoreEvents = [
    { id: "1", sport: "running", track: "open", occurredAt: "2026-10-22T12:00:00Z", scoreBefore: 1000, scoreAfter: 1001 },
    { id: "2", sport: "running", track: "open", occurredAt: "2026-10-22T20:00:00Z", scoreBefore: 1001, scoreAfter: 1002 },
    { id: "3", sport: "running", track: "verified", occurredAt: "2026-10-22T21:00:00Z", scoreBefore: 1000, scoreAfter: 1005 },
    { id: "4", sport: "cycling", track: "open", occurredAt: "2026-10-22T21:00:00Z", scoreBefore: 1000, scoreAfter: 1005 },
    { id: "5", sport: "running", track: "open", occurredAt: "2026-10-23T12:00:00Z", scoreBefore: 1002, scoreAfter: 1003 },
  ];
  const chart = effortScoreLine(state, "open", "week", now);
  expect(chart.points.map(p => p.id)).toEqual(["1", "2", "current"]);
  expect(chart.points.map(p => p.value)).toEqual(["1001", "1002", "1002"]);
  expect(chart.points[0]!.x).toBeLessThan(chart.points[1]!.x);
});

it("does not double count settlements already represented in durable score events", () => {
  const now = new Date("2026-10-22T22:00:00Z"), state = freshState(now);
  state.periodResults = [{ id: "settled", sport: "running", track: "open", periodEnd: "2026-10-19T04:00:00Z", eloBefore: 1000, eloAfter: 1030 }] as typeof state.periodResults;
  state.effortScoreEvents = [{ id: "recorded-settlement", sport: "running", track: "open", occurredAt: "2026-10-19T04:00:00Z", scoreBefore: 1000, scoreAfter: 1030 }];
  expect(effortScoreLine(state, "open", "week", now).points.map(p => p.id)).not.toContain("settlement:settled");
});

it("leaves gaps where old milestone award times are unknown", () => {
 const now = new Date("2026-10-22T22:00:00Z"), state = freshState(now);
 state.periodResults = [
   { id: "first", sport: "running", track: "open", periodEnd: "2026-10-19T04:00:00Z", eloBefore: 1000, eloAfter: 1030 },
   { id: "second", sport: "running", track: "open", periodEnd: "2026-10-20T04:00:00Z", eloBefore: 1035, eloAfter: 1060 },
 ] as typeof state.periodResults;
 state.ratings[0]!.openElo = 1062;
 const chart = effortScoreLine(state, "open", "week", now);
 expect(chart.segments).toHaveLength(3); // two known settlement changes and a standalone current reading
 expect(chart.points.map(p => p.value)).toEqual(["1030", "1060", "1062"]);
});

it("grounds the Home week chart on Monday and includes non-competing activities despite mid-week enrollment", () => {
  const now = new Date("2026-10-24T14:00:00Z"); // Saturday
  const state = freshState(now);
  // Mid-week enrollment starting Thursday (daily wave)
  state.enrollments = [
    {
      sport: "running",
      waveStart: "2026-10-22T10:00:00.000Z", // Thursday 06:00 ET
      weekEnd: "2026-10-26T04:00:00.000Z", // Monday 00:00 ET
      capacity: 8,
      peerIds: [],
      syntheticIds: [],
      autoEnrollNext: true,
      crewId: null,
    },
  ];
  // Tuesday walk (non-competing sport before enrollment) and Friday run
  state.activities = [
    {
      id: "tuesday-walk",
      sport: "walking",
      startedAt: "2026-10-20T14:00:00.000Z", // Tuesday
      movingSec: 3600,
      source: "strava",
      provenance: "recorded",
      disposition: "counted",
      verified: true,
      distanceM: 5000,
      avgHr: null,
    },
    {
      id: "friday-run",
      sport: "running",
      startedAt: "2026-10-23T14:00:00.000Z", // Friday
      movingSec: 3600,
      source: "strava",
      provenance: "recorded",
      disposition: "counted",
      verified: true,
      distanceM: 5000,
      avgHr: null,
    },
  ] as typeof state.activities;

  const model = homeTrainingLine(state, "week", now);
  // Must start on Monday (Oct 19)
  expect(model.points[0]?.label).toContain("Oct 19");
  // Must include Tuesday's non-competing activity as well as Friday's run
  expect(model.points.map(p => p.id)).toEqual([
    expect.stringContaining("start:"),
    "tuesday-walk",
    "friday-run",
    expect.stringContaining("end:"),
  ]);
  expect(model.value).toBe("2.0");
});

it("labels the Home week by weekday with whole-number, distinct hour references", () => {
  const now = new Date("2026-11-09T15:00:00Z");
  const chart = homeTrainingLine(freshState(now), "week", now);
  expect(chart.xTicks.map(tick => tick.label)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  expect(chart.yTicks.every(tick => /^-?\d+$/.test(tick.label))).toBe(true);
  expect(new Set(chart.yTicks.map(tick => tick.label)).size).toBe(chart.yTicks.length);
});
