import { describe, expect, it } from "vitest";
import { raceQuery, raceClock } from "./race-rankings";
describe("public race query", () => {
  it("rejects invalid scopes and bounds input", () => {
    expect(raceQuery(new URLSearchParams("sex=invalid&year=1&page=Infinity"))).toMatchObject({ sex: "female", year: null, page: 1, query: "", timeframe:"all",dateError:null });
    expect(raceQuery(new URLSearchParams("page=2147483648")).page).toBe(1);
    expect(raceQuery(new URLSearchParams("sex=other&year=2025&page=401&q=Runner"))).toMatchObject({ sex: "other", year: 2025, page: 401, query: "Runner",timeframe:"year",dateError:null });
  });
  it("formats observed clocks without scaling", () => {
    expect(raceClock(12601000)).toBe("3:30:01");
  });
});
