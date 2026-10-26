import { expect, it } from "vitest";
import { fieldBoardForEnrollment, freshState, reduceCompete, weeklyBoard } from "./engine";
import { prepareCompeteStateForAccount } from "./sanitize";
import { applyRemoteSnapshot } from "./snapshot";
import type { CrewBoardPin } from "./sports";
const now = "2026-10-21T12:00:00.000Z";
function fixture() {
  const state = reduceCompete(freshState(new Date(now)), { type: "opt-in", sport: "running", now });
  const enrollment = state.enrollments[0]!;
  const pin: CrewBoardPin = { crewId: "solo", crewName: "Open Field", sport: "running", waveStart: enrollment.waveStart, weekEnd: enrollment.weekEnd,
    capacity: 2, syntheticIds: [], memberIds: ["athlete", "peer"], members: [{ id: "peer", name: "Real Peer", elo: 1200, distanceM: 6000, movingSec: 1800, verifiedDistanceM: 4000, verifiedMovingSec: 1500 }] };
  state.enrollments = [{ ...enrollment, peerIds: ["peer"], syntheticIds: [], capacity: 2, fieldBoard: pin }];
  return { state, pin };
}
it("uses the sport snapshot when the legacy board belongs to another sport", () => {
  const { state, pin } = fixture();
  state.crewBoard = { ...pin, sport: "cycling" };
  expect(fieldBoardForEnrollment(state, state.enrollments[0]!)).toEqual(pin);
  expect(weeklyBoard(state, "running", "verified", new Date(now)).find(row => row.id === "peer")?.distanceM).toBe(4000);
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
