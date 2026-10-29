import { expect, it } from "vitest";
import { settleElo } from "./elo";
import { fieldBoardForEnrollment, freshState, reduceCompete, rollClock, settleCompetition, weeklyBoard } from "./engine";
import { prepareCompeteStateForAccount } from "./sanitize";
import { applyRemoteSnapshot } from "./snapshot";
import type { CrewBoardPin } from "./sports";
import { activityEffort } from "./effort";
const now = "2026-10-21T12:00:00.000Z";
function fixture() {
  const state = reduceCompete(freshState(new Date(now)), { type: "opt-in", sport: "running", now: "2026-10-21T09:00:00Z" });
  const enrollment = state.enrollments[0]!;
  const pin: CrewBoardPin = { crewId: "solo", crewName: "Open Field", sport: "running", waveStart: enrollment.waveStart, weekEnd: enrollment.weekEnd,
    capacity: 2, syntheticIds: [], memberIds: ["athlete", "peer"], members: [{ id: "peer", name: "Real Peer", elo: 1200, distanceM: 6000, movingSec: 1800, verifiedDistanceM: 4000, verifiedMovingSec: 1500 }] };
  state.enrollments = [{ ...enrollment, peerIds: ["peer"], syntheticIds: [], capacity: 2, fieldBoard: pin }];
  return { state, pin };
}
it("uses the same weighted strength score for an athlete and their opponents", () => {
  const joined = reduceCompete(freshState(new Date(now)), { type: "opt-in", sport: "strength", now: "2026-10-21T09:00Z" });
  const active = reduceCompete(joined, { type: "log-manual", sport: "strength", movingSec: 3600, activityId: "strength-session", now: "2026-10-21T11:00Z" });
  active.activities = active.activities.map(activity => ({ ...activity, avgHr: 180, provenance: "recorded" }));
  const effort = activityEffort(active.activities[0]!);
  const enrollment = active.enrollments[0]!;
  const pin: CrewBoardPin = { crewId: "solo", crewName: "Open Field", sport: "strength", waveStart: enrollment.waveStart, weekEnd: enrollment.weekEnd,
    capacity: 2, syntheticIds: [], memberIds: ["athlete", "peer"], members: [{ id: "peer", name: "Peer", elo: 1000, distanceM: 0, movingSec: 3600, effort }] };
  active.enrollments = [{ ...enrollment, capacity: 2, peerIds: ["peer"], syntheticIds: [], fieldBoard: pin }];
  const board = weeklyBoard(active, "strength", "open", new Date(now));
  expect(board.map(row => row.effort)).toEqual([effort, effort]);
  expect(board.map(row => row.place)).toEqual([1, 1]);
});
it("uses the sport snapshot when the legacy board belongs to another sport", () => {
  const { state, pin } = fixture();
  state.crewBoard = { ...pin, sport: "cycling" };
  expect(fieldBoardForEnrollment(state, state.enrollments[0]!)).toEqual(pin);
  expect(weeklyBoard(state, "running", "verified", new Date(now)).find(row => row.id === "peer")?.distanceM).toBe(4000);
});
it("settles a configured account when its caller supplies an authoritative closing field", () => {
  const { state, pin } = fixture();
  state.requiresCanonicalFields = true;
  state.enrollments[0]!.awaitingField = true;
  const settled = settleCompetition(state, new Date(pin.weekEnd), [pin]);
  expect(settled.periodResults).toHaveLength(2);
});
it("rejects snapshots from another wave, end date, sport or Crew", () => {
  for (const change of [{ waveStart: "2026-10-12T04:00:00.000Z" }, { weekEnd: "2026-10-27T04:00:00.000Z" }, { sport: "cycling" as const }, { crewId: "private-crew", crewName: "Private" }]) {
    const { state, pin } = fixture();
    state.enrollments[0]!.fieldBoard = { ...pin, ...change };
    expect(fieldBoardForEnrollment(state, state.enrollments[0]!)).toBeNull();
  }
});
it("lets an explicitly supplied settlement or Crew board override an older enrollment snapshot", () => {
  const { state, pin } = fixture();
  state.crewBoard = { ...pin, members: [{ ...pin.members[0]!, distanceM: 9000 }] };
  expect(weeklyBoard(state, "running", "open", new Date(now)).find(row => row.id === "peer")?.distanceM).toBe(9000);
});
it("strips enrollment snapshots from writes even when there is no legacy board", () => {
  const { state } = fixture();
  expect(state.crewBoard).toBeNull();
  const prepared = prepareCompeteStateForAccount(state);
  expect(prepared.enrollments[0]).not.toHaveProperty("fieldBoard");
  expect(state.enrollments[0]!.fieldBoard).toBeDefined();
});
it("refreshes per-sport peer totals in a dirty draft without losing the athlete's renewal choice", () => {
  const { state, pin } = fixture();
  state.demoNow = now;
  const local = { ...state, enrollments: state.enrollments.map(e => ({ ...e, autoEnrollNext: false })) };
  const remote = { ...state, enrollments: state.enrollments.map(e => ({ ...e, fieldBoard: { ...pin, members: [{ ...pin.members[0]!, distanceM: 11000 }] } })) };
  const merged = applyRemoteSnapshot(local, remote, true);
  expect(merged.enrollments[0]!.autoEnrollNext).toBe(false);
  expect(weeklyBoard(merged, "running", "open", new Date(now)).find(row => row.id === "peer")?.distanceM).toBe(11000);
});

it("shares the same place for equal distance even when weighted effort differs, and settles ties fairly", () => {
  const { state, pin } = fixture();
  state.name = "Zoe";
  state.demoNow = null;
  state.enrollments[0]!.fieldBoard = { ...pin, members: [{ ...pin.members[0]!, distanceM: 6000, movingSec: 3600, elo: 1000 }] };
  state.ratings = state.ratings.map(rating => rating.sport === "running" ? { ...rating, openElo: 1000 } : rating);
  const active = reduceCompete(state, { type: "log-manual", sport: "running", distanceM: 6000, movingSec: 1200, activityId: "you-run", startedAt: "2026-10-21T11:00:00.000Z", now });
  const board = weeklyBoard(active, "running", "open", new Date(now));
  expect(board.map(row => row.place)).toEqual([1, 1]);
  expect(board[0]!.effort).not.toEqual(board[1]!.effort);
  const closed = rollClock(active, new Date("2026-10-26T04:01:00Z"));
  const result = closed.periodResults.find(row => row.sport === "running" && row.track === "open");
  expect(result?.place).toBe(1);
  expect(result?.eloAfter).toBe(settleElo(result!.eloBefore, [1000], 0.5, 2, result!.effort, false));
});

it("orders GPS standings by full distance, even when the rounded display or weighted efforts suggest otherwise", () => {
  const { state, pin } = fixture();
  state.enrollments[0]!.fieldBoard = { ...pin, members: [{ ...pin.members[0]!, distanceM: 6001, movingSec: 3600 }] };
  const active = reduceCompete(state, { type: "log-manual", sport: "running", distanceM: 6000, movingSec: 1200, activityId: "you-run", startedAt: "2026-10-21T11:00:00.000Z", now });
  const board = weeklyBoard(active, "running", "open", new Date(now));
  expect(board.map(row => [row.id, row.place])).toEqual([["peer", 1], ["you", 2]]);
});
