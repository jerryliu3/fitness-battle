import { describe, expect, it } from "vitest";
import { freshState } from "./compete/engine";
import type { SleepNight } from "./compete/health";
import { buildHealth7DayCorridorModel, getHealthMetricCorridor, healthSignal, healthSignalRange, healthSparkline, homeHealthMetrics, isSampleSleepNight } from "./home-health";
const now = new Date("2026-10-25T03:30:00Z"); // Oct 24 Eastern
const night = (overrides: Partial<SleepNight> = {}): SleepNight => ({ id: "sleep", metric: "sleep", day: "2026-10-24", durationMin: 462, score: 80, efficiency: null, deepMin: null, remMin: null, lightMin: null, awakeMin: null, source: "oura", verified: true, ...overrides });
describe("Home daily health", () => {
  it("uses the Eastern wake date and recorded duration; no workout substitutes", () => {
    const state = freshState(now);
    state.sleepNights = [night(), night({ id: "future", day: "2026-10-25", durationMin: 600 })];
    const metrics = homeHealthMetrics(state, now);
    expect(metrics[0].value).toBe("7h 42m");
    expect(metrics[0].detail).toContain("Oura");
    expect(metrics[0].history.at(-1)).toBe(462);
    expect(metrics.slice(1).map(metric => metric.value)).toEqual(["—", "—", "—"]);
  });
  it("keeps stale nights, history fixtures and invalid durations out of today's value", () => {
    const state = freshState(now);
    state.sleepNights = [night({ day: "2026-10-23" }), night({ source: "history" }), night({ durationMin: NaN }), night({ durationMin: 0 })];
    const sleep = homeHealthMetrics(state, now)[0];
    expect(sleep.value).toBe("—");
    expect(sleep.detail).toContain("2026-10-23");
    expect(sleep.history.at(-1)).toBeNull();
    expect(sleep.history.at(-2)).toBe(462);
  });
  it("prefers an actual verified night over manual data and resets with the supplied account", () => {
    const state = freshState(now);
    state.sleepNights = [night({ source: "manual", verified: false, durationMin: 300 }), night()];
    expect(homeHealthMetrics(state, now)[0].value).toBe("7h 42m");
    expect(homeHealthMetrics(freshState(now), now)[0].value).toBe("—");
  });
  it("does not draw across missing days or invent a zero trend", () => {
    const spark = healthSparkline([null, 400, 430, null, 450, null, 420]);
    expect(spark.segments).toHaveLength(3);
    expect(spark.dots).toHaveLength(4);
    expect(healthSparkline([null, null]).dots).toEqual([]);
    expect(healthSparkline([420]).dots[0].y).toBeGreaterThan(0);
  });
  it("never presents known sample nights or stub tracker data as daily health", () => {
    const state = freshState(now);
    state.sleepNights = [night({ id: "sleep-oura-2026-10-24" })];
    expect(homeHealthMetrics(state, now)[0].value).toBe("—");
    state.sleepNights = [night()];
    state.links = [{ provider: "oura", linked: true, status: "stub" }];
    expect(homeHealthMetrics(state, now)[0].value).toBe("—");
  });
});

it("fills health signals from zero against the seven-day maximum without treating gaps as zero", () => {
  const signal = healthSignal([400, null, 500, 450]);
  expect(signal.available).toBe(true);
  expect(signal.maximum).toBe(500);
  expect(signal.fraction).toBe(.9);
  expect(signal.fill).not.toContain("NaN");
  expect(healthSignal([400, null]).fill).toBeNull();
  expect(healthSignal([400, null]).available).toBe(false);
  expect(healthSignal([NaN, -1]).available).toBe(false);
  expect(healthSignal([0]).available).toBe(true);
  expect(healthSignal([0]).fill).toBeNull();
  expect(healthSignal([]).track).not.toContain("NaN");
});

it("labels the observed range with sleep units and ignores missing days", () => {
  const metric = homeHealthMetrics(freshState(now), now)[0];
  expect(healthSignalRange({ ...metric, history: [414, null, 480, 462] })).toBe("6h 54m–8h (7 day range)");
  expect(healthSignalRange({ ...metric, id: "resting-hr", history: [49, null, 54, 52] })).toBe("49–54 (7 day range)");
  expect(healthSignalRange({ ...metric, history: [414, null] })).toBe("No reading available");
});

 it("recognizes sample and stub sleep readings consistently", () => {
  const state = freshState(now);
  expect(isSampleSleepNight(state, night({ id: "sleep-oura-2026-10-24" }))).toBe(true);
  expect(isSampleSleepNight(state, night())).toBe(false);
  state.links = [{ provider: "oura", linked: true, status: "stub" }];
  expect(isSampleSleepNight(state, night())).toBe(true);
});

it("shows actual daily measurements and leaves absent or future measurements as gaps",()=>{
 const state=freshState(now); state.dailyHealth=[{provider:"garmin",day:"2026-10-24",steps:5432,restingHr:52,hrv:48},{provider:"oura",day:"2026-10-25",steps:99999}];
 const metrics=homeHealthMetrics(state,now);
 expect(metrics.slice(1).map(r=>r.value)).toEqual(["5,432","52","48"]);
 expect(metrics[1].history.at(-1)).toBe(5432);
 expect(metrics[1].detail).toContain("Garmin");
});

it("builds 7-day health corridor chart model identifying points under, in, or over corridor", () => {
  const hrvMetric = {
    id: "hrv" as const,
    name: "HRV",
    value: "54",
    unit: "ms",
    context: "Today",
    detail: "Garmin · recorded 2026-10-24",
    history: [72, 70, 58, null, 65, 85, 54],
    baselineHistory: [62, 65, 68, 72, 75, 80, 82],
  };
  const chart = buildHealth7DayCorridorModel(hrvMetric, now);
  expect(chart.points).toHaveLength(7);
  expect(chart.baselineLow).toBe(62);
  expect(chart.baselineHigh).toBe(82);
  expect(chart.formattedRange).toBe("62 ms–82 ms");
  expect(chart.points[6].dayLabel).toBe("Today");
  expect(chart.points[6].position).toBe("under"); // 54 < 62
  expect(chart.points[2].position).toBe("under"); // 58 < 62
  expect(chart.points[0].position).toBe("in"); // 72 is in 62..82
  expect(chart.points[5].position).toBe("over"); // 85 > 82
  expect(chart.points[3].position).toBe("missing"); // null
  expect(chart.hasUnder).toBe(true);
  expect(chart.corridorAreaPath).toContain("M 38,");
  expect(chart.lineSegments.length).toBeGreaterThan(0);
});

it("withholds the baseline without seven prior readings", () => {
  const metric = homeHealthMetrics(freshState(now), now)[3]!;
  const chart = buildHealth7DayCorridorModel({...metric,history:[40,41,42,43,44,45,46]},now);
  expect(chart.hasBaseline).toBe(false);
  expect(chart.points.every(p=>p.position === "unavailable")).toBe(true);
  expect(chart.hasUnder).toBe(false);
  expect(getHealthMetricCorridor("hrv",[10,20,30])).toBeNull();
  expect(getHealthMetricCorridor("hrv",[20,21,22,23,24,25,26])?.high).toBe(26);
});
