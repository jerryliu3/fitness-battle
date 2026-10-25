import { describe, expect, it } from "vitest";
import { freshState } from "./compete/engine";
import type { SleepNight } from "./compete/health";
import { healthSparkline, homeHealthMetrics } from "./home-health";
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
