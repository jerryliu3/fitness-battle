import { expect, it } from "vitest";
import { crewDerbyScore, crewDerbyOpponent, type CrewDerby } from "./crew-derby";
const derby: CrewDerby = { field_id: "f", sport: "running", wave_start: "2026-11-11T11:00Z", week_end: "2026-11-16T05:00Z", teams: [
  { crew_id: "a", name: "A", score: 1500, place: 1 }, { crew_id: "b", name: "B", score: 1500, place: 1 }, { crew_id: "c", name: "C", score: 1000, place: 3 },
] };
it("selects the next crew for the leader and the crew ahead for other teams", () => {
  expect(crewDerbyOpponent(derby, "a")?.crew_id).toBe("b");
  expect(crewDerbyOpponent(derby, "c")?.crew_id).toBe("b");
  expect(crewDerbyOpponent(derby, "outsider")).toBeUndefined();
});
it("formats the ordinary event score without target percentages", () => {
  expect(crewDerbyScore("strength", 5400)).toBe("1.5 hrs");
  expect(crewDerbyScore("walking", 12500)).toBe("12,500 steps");
  expect(crewDerbyScore("running", 1500, "metric")).toContain("km");
});
