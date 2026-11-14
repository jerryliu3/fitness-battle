import { describe, expect, it } from "vitest";
import { athleteLocationLine, countryFlagEmoji, filterCountries } from "./countries";

describe("countries", () => {
  it("filters by name or code", () => {
    expect(filterCountries("united").map((r) => r.code)).toContain("US");
    expect(filterCountries("jp")[0]?.code).toBe("JP");
  });

  it("formats location with city and flag", () => {
    expect(athleteLocationLine("Boston", "US")).toMatch(/Boston.*🇺🇸/);
    expect(countryFlagEmoji("US")).toBe("🇺🇸");
  });
});