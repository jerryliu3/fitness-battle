import { describe, it, expect } from "vitest";
import {
  arenaWindow,
  arenaPosition,
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
});
