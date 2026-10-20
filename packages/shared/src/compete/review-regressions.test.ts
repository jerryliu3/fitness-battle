import { describe, expect, it } from "vitest";
import { freshState, reduceCompete, rollClock } from "./engine";
import { parseManualActivity } from "./manual-input";
import { roundEnrollment, roundReveal } from "./round-reveal";
import type { CrewBoardPin } from "./sports";
const now = "2026-10-19T15:00:00Z";
describe("cross-platform manual entry", () => {
  it.each(["", " ", "NaN", "-1", "1,2,3"])("rejects invalid GPS mileage %s", (input) => {
    expect(parseManualActivity("running", input, "30").error).toBeTruthy();
  });
  it("accepts native decimal-keyboard commas and duration-only strength", () => {
    expect(parseManualActivity("running", "2,5", "30,5")).toEqual({ distanceM: 4023.36, movingSec: 1830, error: null });
    expect(parseManualActivity("strength", "", "30")).toEqual({ distanceM: 0, movingSec: 1800, error: null });
  });
  it.each(["", "0", "-1", "1441"])("rejects invalid duration %s", (input) => {
    expect(parseManualActivity("running", "3", input).error).toBeTruthy();
  });
});
function enrolled() {
  let state = freshState(new Date(now));
  for (const sport of ["running", "cycling"] as const) {
    state = reduceCompete(state, { type: "opt-in", sport, accountId: "athlete", now });
    state = reduceCompete(state, { type: "log-manual", sport, distanceM: 5000, movingSec: 1800, activityId: sport, now });
  }
  state = { ...state, enrollments: state.enrollments.map((row) => ({ ...row, capacity: 2, peerIds: [`peer-${row.sport}`], syntheticIds: [], crewId: undefined })) };
  return state;
}
describe("round settlement and reveal", () => {
  it("settles each sport against its own field instead of losing the old pin at rollover", () => {
    const state = enrolled();
    const pins: CrewBoardPin[] = state.enrollments.map((row) => ({
      crewId: "solo", crewName: "Open Field", sport: row.sport, waveStart: row.waveStart, weekEnd: row.weekEnd,
      capacity: 2, memberIds: ["athlete", `peer-${row.sport}`], syntheticIds: [], members: [
        { id: "athlete", name: "Athlete", elo: 1000, distanceM: 5000, movingSec: 1800 },
        { id: `peer-${row.sport}`, name: "Peer", elo: 1000, distanceM: row.sport === "running" ? 50000 : 0, movingSec: 1800 },
      ],
    }));
    const after = rollClock(state, new Date("2026-10-26T04:00:00Z"), pins);
    expect(after.periodResults.find((row) => row.sport === "running" && row.track === "open")?.place).toBe(2);
    expect(after.periodResults.find((row) => row.sport === "cycling" && row.track === "open")?.place).toBe(1);
    expect(after.crewBoard).toBeNull();
  });
  it("acknowledges both tracks together and describes stopped sports accurately", () => {
    let state = reduceCompete(enrolled(), { type: "schedule-leave", sport: "running", now });
    state = rollClock(state, new Date("2026-10-26T04:00:00Z"));
    const reveal = roundReveal(state)!;
    expect(reveal.results).toHaveLength(2);
    expect(reveal.ids).toHaveLength(4);
    expect(roundEnrollment(state, reveal.results.find((row) => row.sport === "running")!).status).toBe("inactive");
    state = reduceCompete(state, { type: "acknowledge-reveal", revealIds: reveal.ids, now: "2026-10-26T04:00:00Z" });
    expect(roundReveal(state)).toBeNull();
  });
});
