import { describe, expect, it } from "vitest";
import { planJourneyLanes, routeThroughCenters } from "./journey-route";

describe("planJourneyLanes", () => {
  it("winds future→today→sessions→start for any session count", () => {
    expect(planJourneyLanes(0)).toEqual(["r", "c", "c"]);
    expect(planJourneyLanes(1)).toEqual(["r", "c", "l", "c"]);
    expect(planJourneyLanes(2)).toEqual(["r", "c", "l", "r", "c"]);
    expect(planJourneyLanes(3)).toEqual(["r", "c", "l", "r", "l", "c"]);
  });
});

describe("routeThroughCenters", () => {
  it("emits one segment per consecutive pair and starts/ends on those centers", () => {
    const centers = [
      { x: 100, y: 50 },
      { x: 200, y: 150 },
      { x: 100, y: 250 },
    ];
    const segs = routeThroughCenters(centers, 400);
    expect(segs).toHaveLength(2);
    expect(segs[0]!.startsWith("M 100.0 50.0")).toBe(true);
    expect(segs[0]!.endsWith("200.0 150.0")).toBe(true);
    expect(segs[1]!.startsWith("M 200.0 150.0")).toBe(true);
    expect(segs[1]!.endsWith("100.0 250.0")).toBe(true);
  });

  it("returns empty when fewer than two centers", () => {
    expect(routeThroughCenters([], 400)).toEqual([]);
    expect(routeThroughCenters([{ x: 1, y: 1 }], 400)).toEqual([]);
  });
});
