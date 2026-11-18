import { expect, it } from "vitest";
import { freshState, type Activity } from "./compete";
import { athleteCardModel, athleteCardModelForPeer, athleteCardHighlightCatalog, defaultAthleteCardHighlightIds, formatMemberSince, parseAthleteCardMessage } from "./athlete-card";

const now = new Date("2026-11-08T12:00:00Z");
function run(id: string, startedAt: string, seconds: number, distanceM = 5000): Activity {
  return { id, startedAt, sport: "running", movingSec: seconds, distanceM, avgHr: null, source: "strava", verified: true, provenance: "recorded" };
}
it("shows the latest best per distance for the primary sport, not old improvements or future records", () => {
  const state = freshState(now);
  state.primary = "running";
  state.activities = [run("old", "2026-10-01T12:00:00Z", 1500), run("best", "2026-11-01T12:00:00Z", 1400), run("slower", "2026-11-02T12:00:00Z", 1550), run("future", "2026-12-01T12:00:00Z", 1000), { ...run("ride", "2026-11-03T12:00:00Z", 1000, 50000), sport: "cycling" }];
  const model = athleteCardModel(state, now);
  expect(model.records).toHaveLength(3);
  expect(model.records[0]).toMatchObject({ id: "pb:running:5k", label: "5K", value: "23:20", date: "2026-11-01T12:00:00Z" });
  expect(model.records.some(record => record.date.startsWith("2026-12"))).toBe(false);
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
it("keeps missing photos, ratings and personal bests unavailable", () => {
  const state = freshState(now);
  state.activities = []; state.recordAttempts = []; state.ratings = []; state.avatarUrl = null;
  const model = athleteCardModel(state, now);
  expect(model.avatarUrl).toBeNull(); expect(model.score).toBeNull(); expect(model.rank).toBeNull(); expect(model.records).toHaveLength(3);
  expect(model.records.every(record => record.kind !== "record")).toBe(true);
  expect(model.personalBests).toEqual([]);
});
it("builds a minimal peer card model for foreign athlete profiles", () => {
  const model = athleteCardModelForPeer({ name: "Jordan Lee", score: 1090, city: "Brooklyn" });
  expect(model.name).toBe("Jordan Lee");
  expect(model.score).toBe(1090);
  expect(model.records).toEqual([]);
  expect(parseAthleteCardMessage({ type: "athlete-card", model, active: true })).toEqual({ model, active: true, appearance: "light" });
});

it("formats membership month labels in Eastern time", () => {
  expect(formatMemberSince("2026-06-15T12:00:00Z")).toBe("Since 6/26");
});

it("validates the card bridge and rejects malformed nested values", () => {
  const model = athleteCardModel(freshState(now), now);
  expect(parseAthleteCardMessage({ type: "athlete-card", model, active: false, appearance: "dark" })).toEqual({ model, active: false, appearance: "dark" });
  for (const invalid of [null, { type: "athlete-card", model, active: "yes" }, { type: "athlete-card", model: { ...model, records: [null] }, active: true }, { type: "athlete-card", model: { ...model, score: Infinity }, active: true }]) expect(parseAthleteCardMessage(invalid)).toBeNull();
});

it("defaults to three available highlights and keeps the customizer in sync", () => {
  const state = freshState(now);
  state.activities = []; state.recordAttempts = [];
  const available = athleteCardHighlightCatalog(state, now);
  const model = athleteCardModel(state, now);
  expect(model.records.map(item => item.id)).toEqual(available.slice(0, 3).map(item => item.id));
  expect(defaultAthleteCardHighlightIds(state, now)).toEqual(model.records.map(item => item.id));
  expect(new Set(model.records.map(item => item.id)).size).toBe(3);
  state.cardHighlights = ["stat:time", "stat:distance"];
  expect(athleteCardModel(state, now).records.map(item => item.id)).toEqual(state.cardHighlights);
  state.cardHighlights = [];
  expect(athleteCardModel(state, now).records).toEqual([]);
});

it("uses counted lifetime totals and validates them across the bridge", () => {
  const state = freshState(now);
  state.activities = [run("counted", "2026-11-01T12:00:00Z", 1400), run("future", "2026-12-01T12:00:00Z", 1000)];
  const model = athleteCardModel(state, now);
  const catalog = athleteCardHighlightCatalog(state, now);
  expect(model.lifetime).toEqual({ distance: catalog.find(item => item.id === "stat:distance")!.value, activities: "1", time: catalog.find(item => item.id === "stat:time")!.value });
  expect(parseAthleteCardMessage({ type: "athlete-card", active: true, model: { ...model, lifetime: { distance: 5 } } })).toBeNull();
  expect(parseAthleteCardMessage({ type: "athlete-card", active: true, model: { ...model, lifetime: undefined } })).not.toBeNull();
});

it("keeps reverse personal bests independent of selected front highlights", () => {
  const state = freshState(now);
  state.primary = "running";
  state.recordAttempts = [];
  state.activities = [run("best", "2026-11-01T12:00:00Z", 1400), { ...run("ride", "2026-11-02T12:00:00Z", 3600, 50000), sport: "cycling" }];
  state.cardHighlights = ["stat:time"];
  const model = athleteCardModel(state, now);
  expect(model.records.map(item => item.id)).toEqual(["stat:time"]);
  expect(model.personalBests).toEqual([expect.objectContaining({ id: "pb:running:5k", value: "23:20" })]);
  state.cardHighlights = [];
  expect(athleteCardModel(state, now).personalBests).toEqual(model.personalBests);
  for (const personalBests of [[null], [{ label: "X", value: "1", date: "", kind: "stat" }], Array(4).fill(model.personalBests![0])]) {
    expect(parseAthleteCardMessage({ type: "athlete-card", active: true, model: { ...model, personalBests } })).toBeNull();
  }
  state.activities = [];
  expect(athleteCardModel(state, now).personalBests).toEqual([]);
});

it("shows completed Open podiums without counting future or GPS results", () => {
  const state = freshState(now);
  const result = { id: "podium", sport: "running" as const, track: "open" as const, place: 3, periodStart: "2026-10-26T04:00:00Z", periodEnd: "2026-11-02T05:00:00Z", fieldSize: 8, effort: 1, distanceM: 1000, movingSec: 300, eloBefore: 1000, eloAfter: 1000, frozen: false, settledAt: "2026-11-02T05:00:00Z" };
  state.periodResults = [result, { ...result, id: "win", place: 1 }, { ...result, id: "fourth", place: 4 }, { ...result, id: "gps", track: "verified" }, { ...result, id: "future", periodEnd: "2026-12-01T05:00:00Z" }];
  const model = athleteCardModel(state, now);
  expect(model.podiums).toBe(2);
  expect(parseAthleteCardMessage({ type: "athlete-card", active: true, model: { ...model, podiums: -1 } })).toBeNull();
});

it("limits reverse personal bests to the first three available distances", () => {
  const state = freshState(now);
  state.primary = "running";
  state.recordAttempts = [];
  state.activities = [1000, 5000, 10000, 21097.5].map((distance, index) => run(`run-${index}`, "2026-11-01T12:00:00Z", 300 * (index + 1), distance));
  const model = athleteCardModel(state, now);
  expect(model.personalBests?.map(record => record.label)).toEqual(["1K", "5K", "10K"]);
  expect(parseAthleteCardMessage({ type: "athlete-card", active: true, model })).not.toBeNull();
});
