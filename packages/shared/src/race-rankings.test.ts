import { describe, expect, it } from "vitest";
import { raceQuery, raceClock } from "./race-rankings";
describe("public race query", () => {
  it("rejects invalid scopes and bounds input", () => {
    expect(raceQuery(new URLSearchParams("sex=invalid&year=1&page=Infinity"))).toEqual({ sex: "female", year: null, page: 1, query: "" });
    expect(raceQuery(new URLSearchParams("sex=other&year=2025&page=401&q=Runner"))).toEqual({ sex: "other", year: 2025, page: 401, query: "Runner" });
  });
  it("formats observed clocks without scaling", () => {
    expect(raceClock(12601000)).toBe("3:30:01");
  });
});
