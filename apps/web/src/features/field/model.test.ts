import { expect, it } from "vitest";
import { buildArenaModel, buildCompeteTimeSeriesModel, freshState, type SportId } from "@fitness-battle/shared";
import { buildFieldModel } from "./model";

it.each(["walking", "strength"] as const)("aligns %s web lanes, mobile lanes and chart totals", (sport: SportId) => {
  const now = new Date("2026-11-12T18:00:00Z");
  const state = freshState(now);
  state.demoNow = now.toISOString();
  state.primary = sport;
  state.ratings = state.ratings.map(rating => ({ ...rating, optedIn: rating.sport === sport }));
  state.enrollments = [{ sport, waveStart: "2026-11-09T11:00:00Z", weekEnd: "2026-11-16T05:00:00Z",
    capacity: 8, peerIds: [], syntheticIds: [], autoEnrollNext: true }];
  state.dailyHealth = [{ provider: "garmin", day: "2026-11-10", steps: 6000 }];
  state.activities = [{ id: "counted", sport, startedAt: "2026-11-10T18:00:00Z", distanceM: 0,
    movingSec: 3600, avgHr: null, verified: false, source: "garmin", provenance: "imported", disposition: "counted" }];
  const web = buildFieldModel(state, sport, "open", now);
  const mobile = buildArenaModel(state, now, "open", sport);
  const chart = buildCompeteTimeSeriesModel(state, sport, "open", now);
  const expected = sport === "walking" ? 6000 : 1;
  expect(web.runners.find(row => row.you)?.km[2]).toBe(expected);
  expect(mobile.lanes.find(row => row.you)?.values[2]).toBe(expected);
  expect(chart.athletes.find(row => row.you)?.currentValue).toBe(expected);
});
