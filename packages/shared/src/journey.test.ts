import { describe, expect, it } from "vitest";
import {
  groupActivitiesByDay,
  planJourneyTrail,
  routeThroughCenters,
} from "./journey";
describe("shared journey", () => {
  it("groups the same Eastern day across UTC midnight and offset formats", () => {
    const days = groupActivitiesByDay([
      { startedAt: "2026-10-18T00:30:00Z" },
      { startedAt: "2026-10-17T19:00:00-04:00" },
      { startedAt: "2026-10-18T05:00:00Z" },
    ]);
    expect(days.map((d) => [d.day, d.items.length])).toEqual([
      ["2026-10-18", 1],
      ["2026-10-17", 2],
    ]);
  });
  it("caps active days at 30, retains all sessions within a day, and ignores invalid dates", () => {
    const all = Array.from({ length: 40 }, (_, i) => ({
      startedAt: new Date(Date.UTC(2026, 8, i + 1, 12)).toISOString(),
    }));
    expect(
      groupActivitiesByDay([...all, { startedAt: "invalid" }]),
    ).toHaveLength(30);
  });
  it("keeps earlier day lanes stable when a new active day is added", () => {
    const old = [{ id: "2026-10-17" }, { id: "2026-10-15" }];
    expect(
      planJourneyTrail([{ id: "2026-10-18" }, ...old]).days.slice(1),
    ).toEqual(planJourneyTrail(old).days);
  });
  it("connects the provided centers at different viewport widths", () => {
    expect(
      routeThroughCenters(
        [
          { x: 20, y: 96 },
          { x: 80, y: 288 },
        ],
        100,
      )[0],
    ).toContain("80.0 288.0");
  });
});
