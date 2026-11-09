import { expect, it } from "vitest";
import { freshState, type Activity } from "./compete";
import { athleteCardModel, parseAthleteCardMessage } from "./athlete-card";

const now = new Date("2026-11-08T12:00:00Z");
function run(id: string, startedAt: string, seconds: number, distanceM = 5000): Activity {
  return { id, startedAt, sport: "running", movingSec: seconds, distanceM, avgHr: null, source: "strava", verified: true, provenance: "recorded" };
}
it("shows the latest best per distance for the primary sport, not old improvements or future records", () => {
  const state = freshState(now);
  state.primary = "running";
  state.activities = [run("old", "2026-10-01T12:00:00Z", 1500), run("best", "2026-11-01T12:00:00Z", 1400), run("slower", "2026-11-02T12:00:00Z", 1550), run("future", "2026-12-01T12:00:00Z", 1000), { ...run("ride", "2026-11-03T12:00:00Z", 1000, 50000), sport: "cycling" }];
  const model = athleteCardModel(state, now);
  expect(model.records).toEqual([{ label: "5K", value: "23:20", date: "2026-11-01T12:00:00Z" }]);
});
it("reads the existing score and server-owned overtake total without calculating a percentile", () => {
  const state = freshState(now);
  state.ratings.find(r => r.sport === state.primary)!.openElo = 1482;
  state.lifetimeOvertakes = 124;
  const before = JSON.stringify(state);
  const model = athleteCardModel(state, now);
  expect(model.score).toBe(1482);
  expect(model.overtakes).toBe(124);
  expect(model).not.toHaveProperty("percentile");
  expect(JSON.stringify(state)).toBe(before);
});
it("keeps missing photos, ratings and records unavailable", () => {
  const state = freshState(now);
  state.activities = []; state.recordAttempts = []; state.ratings = []; state.avatarUrl = null;
  const model = athleteCardModel(state, now);
  expect(model.avatarUrl).toBeNull(); expect(model.score).toBeNull(); expect(model.rank).toBeNull(); expect(model.records).toEqual([]);
});
it("validates the card bridge and rejects malformed nested values", () => {
  const model = athleteCardModel(freshState(now), now);
  expect(parseAthleteCardMessage({ type: "athlete-card", model, active: false, appearance: "dark" })).toEqual({ model, active: false, appearance: "dark" });
  for (const invalid of [null, { type: "athlete-card", model, active: "yes" }, { type: "athlete-card", model: { ...model, records: [null] }, active: true }, { type: "athlete-card", model: { ...model, score: Infinity }, active: true }]) expect(parseAthleteCardMessage(invalid)).toBeNull();
});
