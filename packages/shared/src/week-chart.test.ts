import { expect, it } from "vitest";
import { freshState, reduceCompete } from "./compete/engine";
import { weeklyHoursComparison, weekHoursDeltaTone } from "./week-chart";
const now = new Date("2026-10-23T16:00:00Z");
it("keeps the calendar training week and pre-registration workouts while a daily wave is queued", async () => {
  const { portfolioWeekChart } = await import("./week-chart");
  const registered = reduceCompete(freshState(now), { type: "opt-in", sport: "running", now: now.toISOString() });
  registered.activities = [{ id: "before-registration", sport: "running", startedAt: "2026-10-20T15:00:00Z", movingSec: 3600,
    distanceM: 5000, avgHr: null, verified: true, provenance: "recorded", disposition: "counted", source: "strava" }];
  const chart = portfolioWeekChart(registered, now);
  expect(chart.currTotalHours).toBe(1);
  expect(chart.startLabel).toBe("Oct 19");
  expect(chart.endLabel).toBe("Oct 25");
});
it("shares current/previous hours while excluding samples and future activity", () => {
  const state = freshState(now);
  state.activities = [
    { id: "today", startedAt: "2026-10-23T15:00:00Z", movingSec: 3600 },
    { id: "previous", startedAt: "2026-10-16T15:00:00Z", movingSec: 1800 },
    { id: "future", startedAt: "2026-10-24T15:00:00Z", movingSec: 10000 },
    { id: "sample", startedAt: "2026-10-23T15:00:00Z", movingSec: 10000, provenance: "demo" },
  ].map(a => ({ sport: "running", distanceM: 1000, avgHr: null, source: "strava", provenance: "recorded", verified: true, disposition: "counted", ...a })) as typeof state.activities;
  const model = weeklyHoursComparison(state, now);
  expect(model.currTotalHours).toBe(1);
  expect(model.prevTotalHours).toBe(.5);
  expect(model.sessionCount).toBe(1);
  expect(model.currCumulativeHours.at(-1)).toBe(1);
});

it("keeps Portfolio lines finite for empty and partial weeks with matching totals", async () => {
  const { portfolioWeekChart } = await import("./week-chart");
  const state = freshState(now);
  state.activities = [];
  const chart = portfolioWeekChart(state, now);
  expect(chart.current).not.toMatch(/NaN|Infinity/);
  expect(chart.tip.x).toBeGreaterThan(chart.left);
  expect(chart.tip.x).toBeLessThan(chart.right);
  expect(chart.startLabel).toBe("Oct 19");
  expect(chart.endLabel).toBe("Oct 25");
  expect(chart.inspection.at(-1)?.x).toBe(chart.tip.x);
  expect(chart.currTotalHours).toBe(weeklyHoursComparison(state, now).currTotalHours);
  expect(chart.deltaTone).toBe("up");
});

it("classifies week-over-week delta tone from same weekday cumulative hours", () => {
  expect(weekHoursDeltaTone({ currHoursSameDay: 2, prevHoursSameDay: 1 })).toBe("up");
  expect(weekHoursDeltaTone({ currHoursSameDay: 1, prevHoursSameDay: 2 })).toBe("down");
  expect(weekHoursDeltaTone({ currHoursSameDay: 1, prevHoursSameDay: 1 })).toBe("up");
  expect(weekHoursDeltaTone({ currHoursSameDay: 1.04, prevHoursSameDay: 1 })).toBe("up");
});

it("delta label compares through today, not full prior week total", async () => {
  const { portfolioWeekChart } = await import("./week-chart");
  const state = freshState(now);
  state.activities = [
    { id: "this-week", startedAt: "2026-10-23T15:00:00Z", movingSec: 3600 },
    { id: "last-week-day", startedAt: "2026-10-16T15:00:00Z", movingSec: 10 * 3600 },
  ].map(a => ({ sport: "running", distanceM: 1000, avgHr: null, source: "strava", provenance: "recorded", verified: true, disposition: "counted", ...a })) as typeof state.activities;
  const chart = portfolioWeekChart(state, now);
  expect(chart.deltaLabel).toBe("-9.0h vs last week");
  expect(chart.deltaTone).toBe("down");
});
