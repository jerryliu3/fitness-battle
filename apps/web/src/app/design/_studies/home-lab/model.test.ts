import { describe, expect, it } from "vitest";
import { fixtureWeek, homeSnapshot, PRODUCT_SEEN_PREFIX, progressGain, readSnapshot, seenKey } from "./model";

describe("adaptive home arrival", () => {
  it("reveals actual newly counted progress", () => {
    const { state, previous } = fixtureWeek("arrival");
    const gain = progressGain(previous, homeSnapshot(state));
    expect(gain?.distanceM).toBeCloseTo(5100);
    expect(gain?.newActivities).toBe(1);
    expect(gain!.effort).toBeGreaterThan(0);
  });
  it("starts with today on a first visit or an unchanged/repeated sync", () => {
    const { state, previous } = fixtureWeek("quiet");
    expect(progressGain(null, homeSnapshot(state))).toBeNull();
    expect(progressGain(previous, homeSnapshot(state))).toBeNull();
    const current = homeSnapshot(fixtureWeek("arrival").state);
    expect(progressGain(current, current)).toBeNull();
  });
  it("does not reveal pending, excluded, demo, future, or other-sport activity", () => {
    const { state, previous } = fixtureWeek("arrival");
    const added = state.activities.at(-1)!;
    for (const change of [
      { disposition: "pending" as const }, { disposition: "excluded" as const },
      { provenance: "demo" as const }, { sport: "cycling" as const },
      { startedAt: "2026-10-15T07:30:00.000Z" },
    ]) {
      expect(progressGain(previous, homeSnapshot({ ...state, activities: [...state.activities.slice(0, -1), { ...added, ...change }] }))).toBeNull();
    }
  });
  it("does not turn rival movement or lesson completion into our gain", () => {
    const { state, previous } = fixtureWeek("quiet");
    const current = homeSnapshot({ ...state, lessonDoneOn: "2026-10-14" });
    current.lanes = current.lanes.map(l => ({ ...l, value: l.you ? l.value : l.value + 5 }));
    expect(progressGain(previous, current)).toBeNull();
  });
  it("resets at period/sport/track boundaries and does not celebrate reductions", () => {
    const { state, previous } = fixtureWeek("arrival");
    const current = homeSnapshot(state);
    expect(progressGain({ ...previous, scope: "old-period" }, current)).toBeNull();
    expect(progressGain(current, previous)).toBeNull();
    expect(homeSnapshot(state, "verified").effort).toBe(0);
  });
  it("isolates accounts and safely ignores corrupt saved snapshots", () => {
    const snapshot = homeSnapshot(fixtureWeek("quiet").state);
    expect(seenKey("one", snapshot)).not.toBe(seenKey("two", snapshot));
    expect(seenKey("one", snapshot, PRODUCT_SEEN_PREFIX)).not.toBe(seenKey("one", snapshot));
    expect(readSnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
    for (const raw of ["not json", "{}", "null", JSON.stringify({ ...snapshot, distanceM: -1 }), JSON.stringify({ ...snapshot, lanes: [null] })]) expect(readSnapshot(raw)).toBeNull();
  });
  it("uses half-open period bounds", () => {
    const { state } = fixtureWeek("quiet");
    const current = homeSnapshot(state);
    const future = { ...state.activities[0]!, id: "end", startedAt: "2026-10-19T00:00:00.000Z" };
    // Period end is Monday 00:00 UTC; an activity there belongs to the next period.
    expect(homeSnapshot({ ...state, activities: [...state.activities, future] }).effort).toBe(current.effort);
  });
});
