import { describe, expect, it } from "vitest";
import {
  distanceAt,
  distancePosition,
  formatDistance,
  gapKm,
  ghost,
  rankAt,
  runners,
} from "./model";

describe("spatial prototype distance semantics", () => {
  it("preserves unequal mileage gaps rather than equal rank spacing", () => {
    const third = distancePosition(20.1, 0, 30, 900),
      you = distancePosition(19.2, 0, 30, 900),
      fifth = distancePosition(16.4, 0, 30, 900);
    expect(third - you).toBeCloseTo(27);
    expect(you - fifth).toBeCloseTo(84);
    expect((you - fifth) / (third - you)).toBeCloseTo(2.8 / 0.9);
  });
  it("shows a pass and reversal at the actual fixture milestones", () => {
    expect(rankAt("you", 0)).toBe(5);
    expect(rankAt("you", 1)).toBe(3);
    expect(rankAt("you", 2)).toBe(4);
    expect(gapKm(runners[2]!, 1)).toBe(-0.6);
    expect(gapKm(runners[2]!, 2)).toBe(0.9);
  });
  it("uses a tie at the what-if threshold rather than floating-point rank artifacts", () => {
    expect(rankAt("you", 2, 0.9)).toBe(3);
    expect(rankAt("maya", 2, 0.9)).toBe(3);
    expect(gapKm(runners[2]!, 2, 0.9)).toBe(0);
    expect(rankAt("you", 2, 6.2)).toBe(1);
  });
  it("interpolates presentation totals and clamps the replay and extra-distance bounds", () => {
    expect(distanceAt(runners[3]!, 1.5)).toBe(16.1);
    expect(distanceAt(runners[3]!, -2)).toBe(5.9);
    expect(distanceAt(runners[3]!, 5, 99)).toBe(27.2);
    expect(distanceAt(ghost, 2, 6.2)).toBe(16);
    expect(rankAt("ghost", 2)).toBe(0);
    expect(runners[3]!.km[2]).toBe(19.2);
  });
  it("converts display units without changing ranking or geometry", () => {
    expect(formatDistance(1.609344, "mi", 2)).toBe("1.00");
    expect(formatDistance(19.2, "km")).toBe("19.2");
    expect(formatDistance(19.2, "mi", 2)).toBe("11.93");
  });
});
