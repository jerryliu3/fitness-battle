import { describe, expect, it } from "vitest";
import {
  comparisonScale,
  formatRallyValue,
  gapText,
  moveIsCounted,
  movesFromActivities,
  snapshotAfterMove,
  valueAtProgress,
  weekProgress,
  type RallyBoard,
  type RallyMove,
  type RallyReference,
} from "./model";
import type { Activity } from "@fitness-battle/shared";

const periodStart = new Date("2026-10-12T00:00:00.000Z");
const periodEnd = new Date("2026-10-19T00:00:00.000Z");

function move(
  id: string,
  startedAt: string,
  km: number,
  effort = km * 5,
): RallyMove {
  return {
    id,
    title: id,
    day: "Monday",
    date: "Oct 12",
    km,
    minutes: 30,
    note: "",
    startedAt,
    verified: true,
    source: "strava",
    effort,
  };
}

describe("rally model helpers", () => {
  it("formats gaps and values for km and points", () => {
    expect(gapText(0, "km")).toBe("Level at this cutoff");
    expect(gapText(1.2, "km")).toBe("1.2 km ahead");
    expect(gapText(-2.5, "km")).toBe("2.5 km behind");
    expect(formatRallyValue(19.2, "km")).toBe("19.2");
    expect(comparisonScale(19.2, 16)).toBe(20);
  });

  it("maps counted activities into move rings", () => {
    const activities = [
      {
        id: "a1",
        sport: "running",
        startedAt: "2026-10-13T12:00:00.000Z",
        distanceM: 5900,
        movingSec: 2100,
        verified: true,
        source: "strava",
      },
    ] as Activity[];
    const moves = movesFromActivities(activities, "running");
    expect(moves).toHaveLength(1);
    expect(moves[0]!.km).toBe(5.9);
    expect(moves[0]!.minutes).toBe(35);
    expect(moves[0]!.day).toBe("Tuesday");
    expect(moves[0]!.effort).toBeGreaterThan(0);
  });

  it("counts every move at the live Now cutoff, not only the first three", () => {
    const moves = [
      move("a", "2026-10-12T12:00:00.000Z", 5),
      move("b", "2026-10-14T12:00:00.000Z", 5),
      move("c", "2026-10-16T12:00:00.000Z", 5),
      move("d", "2026-10-18T12:00:00.000Z", 5),
    ];
    expect(moveIsCounted(moves[3]!, 3, periodStart, periodEnd)).toBe(true);
    expect(moveIsCounted(moves[3]!, 0, periodStart, periodEnd)).toBe(false);
    expect(moveIsCounted(moves[0]!, 1, periodStart, periodEnd)).toBe(true);
  });

  it("interpolates reference totals by week progress for receipts", () => {
    expect(weekProgress("2026-10-12T00:00:00.000Z", periodStart, periodEnd)).toBe(
      0,
    );
    expect(weekProgress("2026-10-19T00:00:00.000Z", periodStart, periodEnd)).toBe(
      1,
    );
    expect(valueAtProgress([10, 20, 30], 0)).toBe(0);
    expect(valueAtProgress([10, 20, 30], 1)).toBe(30);
    expect(valueAtProgress([10, 20, 30], 1 / 3)).toBe(10);
  });

  it("compares a receipt against the same week progress, not ordinal cutoff", () => {
    const ghost: RallyReference = {
      id: "ghost",
      name: "Your previous week",
      initials: "PW",
      ghost: true,
    };
    const moves = [
      move("a", "2026-10-12T12:00:00.000Z", 5),
      move("b", "2026-10-14T12:00:00.000Z", 5),
      move("c", "2026-10-16T12:00:00.000Z", 5),
      move("d", "2026-10-18T12:00:00.000Z", 5),
    ];
    const rally = {
      board: {
        periodStart,
        periodEnd,
        checkpointLabels: ["Early", "Mid", "Now"],
      },
      unit: "km",
      periodLabel: "test",
      moves,
      lanes: [],
      references: [ghost],
      youValues: [5, 15, 20] as [number, number, number],
      ghostValues: [4, 12, 16] as [number, number, number],
    } as unknown as RallyBoard;

    const fourth = snapshotAfterMove(rally, ghost, 3);
    expect(fourth.total).toBe(20);
    // Fourth outing is late in the week — against should be near the ghost week end,
    // not pinned to the third ordinal checkpoint alone.
    expect(fourth.against).toBeGreaterThan(12);
    expect(fourth.count).toBe(4);
  });
});
