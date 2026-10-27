import { describe, expect, it } from "vitest";
import { averageTiePosition, competitionPlace } from "./competition-place";

describe("competition places", () => {
  it("shares positions and skips the occupied places", () => {
    const totals = [12, 8, 8, 8, 1, 0, 0];
    expect(totals.map(value => competitionPlace(totals, value))).toEqual([1, 2, 2, 2, 5, 6, 6]);
    expect(averageTiePosition(totals, 8)).toBe(2);
    expect(averageTiePosition(totals, 0)).toBe(5.5);
  });
  it("does not treat values as tied merely because their displayed precision matches", () => {
    expect(competitionPlace([2.01, 2.02], 2.01)).toBe(2);
  });
});
