import { describe, it, expect } from "vitest";
import {
  arenaWindow,
  arenaPosition,
  clampArenaLaneCenter,
  orderedArenaLanes,
  fitArenaWindow,
} from "./arena-view";
describe("distance viewport", () => {
  it("centers the athlete without compressing an extreme field", () => {
    const w = arenaWindow(23.4, 6);
    expect((w.min + w.max) / 2).toBe(23.4);
    expect(arenaPosition(23.4, w).fraction).toBeCloseTo(0.5);
    expect(arenaPosition(500, w).edge).toBe("ahead");
    expect(arenaPosition(0, w).edge).toBe("behind");
  });
  it("keeps zero visible and finite at the start and after invalid inputs", () => {
    expect(arenaPosition(0, arenaWindow(0, 6)).fraction).toBe(0.5);
    expect(arenaWindow(NaN, Infinity)).toEqual({
      min: -3,
      max: 3,
      center: 0,
      span: 6,
    });
    expect(arenaWindow(-5, 0.01).span).toBe(0.5);
  });
  it("places you in a stable middle lane and never ranks a ghost", () => {
    const lanes = [
      { id: "z" },
      { id: "me", you: true },
      { id: "ghost", ghost: true },
      { id: "a" },
    ];
    expect(orderedArenaLanes(lanes).map((l) => l.id)).toEqual(["a", "me", "z"]);
    expect(lanes).toHaveLength(4);
  });
  it("fits all actual athletes only when explicitly requested", () => {
    const fit = fitArenaWindow([
      { id: "a", name: "A", initials: "A", value: 100 },
      { id: "g", name: "Past", initials: "P", value: 999, ghost: true },
    ]);
    expect(arenaPosition(100, fit).edge).toBeNull();
    expect(fit.span).toBeCloseTo(115);
  });
  it("clamps center in 2D lanes so the start line remains near the bottom", () => {
    // When center is 0 (start line) and span is 20, center is clamped to 8.6
    const clampedCenter = clampArenaLaneCenter(0, 20);
    expect(clampedCenter).toBeCloseTo(8.6);
    // At center = 8.6, start line (0) is at fraction 0.93 (near bottom of visual)
    const pos = arenaPosition(0, { center: clampedCenter, span: 20 });
    expect(pos.fraction).toBeCloseTo(0.93);
    expect(pos.edge).toBeNull();

    // When athlete has progressed well forward (e.g. 30 km), athlete remains centered
    expect(clampArenaLaneCenter(30, 20)).toBe(30);
  });
});
