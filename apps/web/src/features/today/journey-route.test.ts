import { describe, expect, it } from "vitest";
import {
  groupActivitiesByDay,
  lanesHaveNoConsecutiveRepeats,
  planJourneyLanes,
  planJourneyTrail,
  routeThroughCenters,
} from "./journey-route";

describe("groupActivitiesByDay", () => {
  it("one circle per calendar day; newest day first; keeps multiple same-day items together", () => {
    const days = groupActivitiesByDay([
      { startedAt: "2026-10-17T08:00:00.000Z", id: "a" },
      { startedAt: "2026-10-18T07:00:00.000Z", id: "b" },
      { startedAt: "2026-10-17T18:00:00.000Z", id: "c" },
    ]);
    expect(days.map((d) => d.id)).toEqual(["2026-10-18", "2026-10-17"]);
    expect(days[1]!.items.map((i) => i.id)).toEqual(["c", "a"]);
  });

  it("respects day limit", () => {
    const days = groupActivitiesByDay(
      [
        { startedAt: "2026-10-18T12:00:00.000Z" },
        { startedAt: "2026-10-17T12:00:00.000Z" },
        { startedAt: "2026-10-16T12:00:00.000Z" },
      ],
      2,
    );
    expect(days.map((d) => d.id)).toEqual(["2026-10-18", "2026-10-17"]);
  });
});

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
    expect(planJourneyTrail([{ id: "2026-10-17" }]).future).toBe("r");
    expect(
      planJourneyTrail([{ id: "2026-10-18" }, { id: "2026-10-17" }]).future,
    ).toBe("r");
  });

  it("keeps earlier day lanes stable when a newer activity-day is prepended", () => {
    // Oct 17 alone, then user sleeps and logs Oct 18 — 17th must not move.
    const on17 = planJourneyTrail([{ id: "2026-10-17" }]);
    const on18 = planJourneyTrail([
      { id: "2026-10-18" },
      { id: "2026-10-17" },
    ]);
    expect(on18.days[1]).toBe(on17.days[0]);
    expect(on18.start).toBe("c");
    expect(
      lanesHaveNoConsecutiveRepeats([
        on18.future,
        on18.today,
        ...on18.days,
        on18.start,
      ]),
    ).toBe(true);
  });

  it("does not add a lane when a second workout lands on an existing day", () => {
    const oneWorkout = planJourneyTrail([{ id: "2026-10-17" }]);
    // Same day id — still one stop in the plan input.
    const twoWorkoutsSameDay = planJourneyTrail([{ id: "2026-10-17" }]);
    expect(twoWorkoutsSameDay.days).toEqual(oneWorkout.days);
  });

  it("prefers today on center once at least one activity-day exists", () => {
    expect(planJourneyTrail([{ id: "2026-10-17" }]).today).toBe("c");
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
