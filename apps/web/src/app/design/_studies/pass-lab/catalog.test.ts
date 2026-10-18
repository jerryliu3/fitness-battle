import { describe, expect, it } from "vitest";
import { ATHLETES, ICONS, LANES, laneFrame } from "./catalog";

describe("fictional pass study", () => {
  it("preserves lane identity, excludes past you and follows the user at ±3 km", () => {
    for (const gain of [.8, 2, 4.2]) {
      for (const p of [0, .25, .5, .75, 1]) {
        const f = laneFrame(p, gain);
        expect(f.athletes.map(a => a.id)).toEqual(ATHLETES.map(a => a.id));
        expect(f.min).toBeCloseTo(f.value - 3);
        expect(f.max).toBeCloseTo(f.value + 3);
        expect(f.athletes).toHaveLength(5);
      }
    }
  });
  it("only celebrates actual crossings for no-pass, one-pass and two-pass runs", () => {
    expect(laneFrame(0, 4.2)).toMatchObject({ value: 12.4, rank: 4, passes: 0 });
    expect(laneFrame(1, .8)).toMatchObject({ rank: 4, passes: 0 });
    expect(laneFrame(1, 2)).toMatchObject({ rank: 3, passes: 1 });
    expect(laneFrame(1, 4.2)).toMatchObject({ rank: 2, passes: 2 });
    expect(laneFrame(.5, 2.8)).toMatchObject({ rank: 4, passes: 0 }); // Exactly level with Mara is not a pass.
  });
  it("provides the requested breadth and valid icon-to-lane connections", () => {
    expect(ICONS).toHaveLength(15);
    expect(ICONS.filter(c => c.family === "Type")).toHaveLength(3);
    expect(ICONS.filter(c => c.trail).length).toBeGreaterThanOrEqual(5);
    expect(LANES).toHaveLength(8);
    for (const c of ICONS) expect(LANES[c.lane]).toBeDefined();
    for (const l of LANES) expect(ICONS.some(c => c.id === l.icon)).toBe(true);
  });
});
