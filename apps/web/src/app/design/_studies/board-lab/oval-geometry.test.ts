import { describe, expect, it } from "vitest";
import { backgrounds, isBackgroundId, isTrackEdgeId } from "./field-directions";
import { lapPosition, ovalPoint } from "./oval-geometry";

describe("normalized club circuit", () => {
  it("retains total laps across the one-kilometer boundary", () => {
    expect(lapPosition(0)).toEqual({ laps: 0, fraction: 0 });
    expect(lapPosition(20)).toEqual({ laps: 20, fraction: 0 });
    expect(lapPosition(19.999).laps).toBe(19);
    expect(lapPosition(20.001).laps).toBe(20);
    expect(lapPosition(19.2).fraction).toBeCloseTo(.2);
    expect(lapPosition(21.4).fraction).toBeCloseTo(.4);
    expect(lapPosition(19.2).laps).not.toBe(lapPosition(20.2).laps);
    expect(lapPosition(3.218688, 1.609344)).toEqual({ laps: 2, fraction: 0 });
    expect(lapPosition(1.609344 * 2.5, 1.609344).fraction).toBeCloseTo(.5);
    expect(lapPosition(-1)).toEqual({ laps: 0, fraction: 0 });
  });
  it("closes the loop and keeps position and tangent continuous at every join", () => {
    const radius = 190, straight = 270, perimeter = 2 * straight + 2 * Math.PI * radius;
    expect(ovalPoint(0, radius)).toEqual(ovalPoint(1, radius));
    for (const f of [0, straight / perimeter, (straight + Math.PI * radius) / perimeter, (2 * straight + Math.PI * radius) / perimeter]) {
      const a = ovalPoint(f - 1e-7, radius), b = ovalPoint(f + 1e-7, radius);
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(.001);
      const radians = (a.angle - b.angle) * Math.PI / 180;
      expect(Math.cos(radians)).toBeCloseTo(1);
    }
  });
  it("uses equal arc-length steps on straights and curves", () => {
    const r = 190, perimeter = 540 + 2 * Math.PI * r, delta = .0001;
    for (const f of [.05, .3, .55, .8]) {
      const a = ovalPoint(f, r), b = ovalPoint(f + delta, r);
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeCloseTo(perimeter * delta, 5);
    }
  });
  it("keeps the seven accepted grounds and adds both track variants", () => {
    expect(Object.keys(backgrounds)).toHaveLength(9);
    for (const id of ["athletics", "road", "parkland", "pool", "boardwalk", "trail", "night", "straight", "oval"]) expect(isBackgroundId(id)).toBe(true);
    expect(isBackgroundId("contour")).toBe(false);
    expect(isTrackEdgeId("club")).toBe(true); expect(isTrackEdgeId("open")).toBe(true);
    expect(isTrackEdgeId("__proto__")).toBe(false);
  });
});
