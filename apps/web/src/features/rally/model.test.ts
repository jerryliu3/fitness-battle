import { describe, expect, it } from "vitest";
import {
  comparisonScale,
  formatRallyValue,
  gapText,
  movesFromActivities,
} from "./model";
import type { Activity } from "@fitness-battle/shared";

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
  });
});
