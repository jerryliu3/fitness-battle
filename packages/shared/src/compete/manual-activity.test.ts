import { describe, expect, it } from "vitest";
import { freshState, reduceCompete } from "./engine";
import { countsOnTrack } from "./ledger";
const now = "2026-10-19T15:00:00.000Z";
const action = { type: "log-manual" as const, sport: "running" as const, movingSec: 1800, distanceM: 5000, activityId: "manual-1", now };
describe("manual activities", () => {
  it("records today and is eligible only in Open", () => {
    const state = reduceCompete(freshState(new Date(now)), action);
    const activity = state.activities.find((item) => item.id === action.activityId)!;
    expect(activity.startedAt).toBe(now);
    expect(activity.provenance).toBe("manual");
    expect(countsOnTrack(activity, "open")).toBe(true);
    expect(countsOnTrack(activity, "verified")).toBe(false);
  });
  it("retains multiple sessions today and makes retries idempotent", () => {
    const first = reduceCompete(freshState(new Date(now)), action);
    const second = reduceCompete(first, { ...action, activityId: "manual-2" });
    expect(second.activities.length).toBe(first.activities.length + 1);
    expect(reduceCompete(second, action).activities).toEqual(second.activities);
  });
  it.each([NaN, -1, Infinity, 86401])("rejects invalid duration %s", (movingSec) => {
    const state = freshState(new Date(now));
    expect(reduceCompete(state, { ...action, movingSec }).activities).toEqual(state.activities);
  });
});

it("calibrates sample history using completed Eastern days near UTC midnight", () => {
  const now = "2026-10-20T02:00:00.000Z"; // Still Monday evening in New York.
  const state = reduceCompete(freshState(new Date(now)), { type: "import-history", level: "steady", now });
  const latest = Math.max(...state.activities.filter((activity) => activity.source === "history").map((activity) => Date.parse(activity.startedAt)));
  expect(latest).toBeLessThan(Date.parse("2026-10-19T04:00:00Z"));
});

it("records an optional time today without advancing the account clock", () => {
  const state = reduceCompete(freshState(new Date(now)), { ...action, startedAt: "2026-10-19T12:30:00Z" });
  expect(state.activities.find(a => a.id === action.activityId)?.startedAt).toBe("2026-10-19T12:30:00.000Z");
});
it.each(["2026-10-19T16:00:00Z", "2026-10-18T12:00:00Z", "bad-date"])("rejects future or other-day manual activity time %s", startedAt => {
  const state = freshState(new Date(now));
  expect(reduceCompete(state, { ...action, startedAt }).activities).toEqual(state.activities);
});
