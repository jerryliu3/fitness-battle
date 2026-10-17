import { describe, expect, it } from "vitest";
import {
  lanesHaveNoConsecutiveRepeats,
  planJourneyLanes,
  planJourneyTrail,
  routeThroughCenters,
} from "./journey-route";

describe("planJourneyTrail", () => {
  it("keeps start centered and never repeats a lane consecutively", () => {
    for (const n of [0, 1, 2, 3, 4, 5, 8]) {
      const lanes = planJourneyLanes(n);
      expect(lanes[lanes.length - 1]).toBe("c");
      expect(lanesHaveNoConsecutiveRepeats(lanes)).toBe(true);
    }
  });

  it("puts future on the right when today is not already right", () => {
    expect(planJourneyTrail([]).future).toBe("r");
    expect(planJourneyTrail([{ id: "a" }]).future).toBe("r");
    expect(planJourneyTrail([{ id: "b" }, { id: "a" }]).future).toBe("r");
  });

  it("keeps earlier session lanes stable when a newer session is prepended", () => {
    const before = planJourneyTrail([{ id: "newish" }, { id: "oldest" }]);
    const after = planJourneyTrail([
      { id: "newest" },
      { id: "newish" },
      { id: "oldest" },
    ]);
    // sessions arrays are newest-first — oldest stays at the end with same lane
    expect(after.sessions[2]).toBe(before.sessions[1]); // oldest
    expect(after.sessions[1]).toBe(before.sessions[0]); // newish
    expect(after.start).toBe("c");
    expect(lanesHaveNoConsecutiveRepeats([
      after.future,
      after.today,
      ...after.sessions,
      after.start,
    ])).toBe(true);
  });

  it("prefers today on center once at least one session exists", () => {
    expect(planJourneyTrail([{ id: "a" }]).today).toBe("c");
    // Zero sessions: start is already center, so today must step aside
    expect(planJourneyTrail([]).today).not.toBe("c");
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
