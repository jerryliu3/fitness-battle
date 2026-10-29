import { describe, expect, it } from "vitest";
import { freshState, reduceCompete, rollClock, type CrewBoardPin } from "@fitness-battle/shared";
import { planAdminFieldWave } from "./admin-field-wave";
const start = "2026-10-26T04:00:00.000Z";
const end = "2026-11-02T05:00:00.000Z";
const now = new Date("2026-10-30T16:37:00.000Z");
function fixture() {
  const field = { id: "field", sport: "running" as const, wave_start: start, week_end: end, capacity: 2, crew_id: null, name: "Field", member_ids: ["a", "b"], synthetic_ids: [] };
  const accounts = ["a", "b"].map((userId) => {
    let state = reduceCompete(freshState(new Date(start)), { type: "opt-in", sport: "running", now: start });
    state = reduceCompete(state, { type: "opt-in", sport: "cycling", now: start });
    state = { ...state, enrollments: state.enrollments.map((row) => row.sport === "running" ? { ...row, waveStart: start, weekEnd: end, peerIds: [userId === "a" ? "b" : "a"], syntheticIds: [], capacity: 2 } : row) };
    return { userId, updatedAt: start, state };
  });
  const board: CrewBoardPin = { crewId: "solo", crewName: "Field", sport: "running", waveStart: start, weekEnd: end, capacity: 2, memberIds: ["a", "b"], syntheticIds: [], members: ["a", "b"].map((id) => ({ id, name: id, elo: 1000, distanceM: 1000, movingSec: 600, verifiedDistanceM: 500, verifiedMovingSec: 300 })) };
  return { field, accounts, boards: [board, board] };
}
describe("admin field wave orchestration", () => {
  it("closes everyone at the same instant, starts a disjoint wave and preserves other sports", () => {
    const { field, accounts, boards } = fixture();
    accounts[0]!.state.requiresCanonicalFields = true;
    accounts[0]!.state.enrollments[0]!.awaitingField = true;
    const plan = planAdminFieldWave(field, accounts, boards, now, true);
    expect(plan.nextField.wave_start).toBe(now.toISOString());
    expect(plan.nextField.week_end).toBe(end);
    for (const snapshot of plan.snapshots) {
      expect(snapshot.after.periodResults.filter((row) => row.sport === "running")).toHaveLength(2);
      expect(snapshot.after.periodResults.every((row) => row.periodEnd === now.toISOString())).toBe(true);
      expect(snapshot.after.enrollments.find((row) => row.sport === "running")?.waveStart).toBe(now.toISOString());
      expect(snapshot.after.enrollments.find((row) => row.sport === "cycling")).toEqual(snapshot.before.enrollments.find((row) => row.sport === "cycling"));
      expect(snapshot.after.demoNow).toBeNull();
      const livePin = { ...boards[0]!, waveStart: plan.nextField.wave_start, weekEnd: plan.nextField.week_end };
      expect(rollClock({ ...snapshot.after, crewBoard: livePin }, new Date(now.getTime()+3600000)).crewBoard).toEqual(livePin);
    }
  });
  it("honors scheduled stops and schedules normal Monday boundaries for end-only", () => {
    const { field, accounts, boards } = fixture();
    accounts[1]!.state.enrollments = accounts[1]!.state.enrollments.map((row) => row.sport === "running" ? { ...row, autoEnrollNext: false } : row);
    const plan = planAdminFieldWave(field, accounts, boards, now, false);
    expect(plan.nextField.member_ids).toEqual(["a"]);
    expect(plan.nextField.wave_start).toBe("2026-11-02T11:00:00.000Z");
    expect(plan.nextField.week_end).toBe("2026-11-09T05:00:00.000Z");
    expect(plan.snapshots[1]!.after.enrollments.some((row) => row.sport === "running")).toBe(false);
  });
});
