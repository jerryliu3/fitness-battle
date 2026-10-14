import { describe, expect, it } from "vitest";
import { mergeActivities, progressionTrends, sameWorkout } from "./ledger";
import type { Activity } from "./sports";

function run(partial: Partial<Activity> & Pick<Activity, "id" | "startedAt">): Activity {
  return {
    sport: "running",
    distanceM: 8000,
    movingSec: 2400,
    avgHr: 150,
    verified: true,
    source: "strava",
    provenance: "recorded",
    disposition: "counted",
    ...partial,
  };
}

describe("activity ledger", () => {
  it("treats a near-duplicate from another provider as the same workout", () => {
    const left = run({ id: "strava-1", startedAt: "2026-10-13T12:00:00.000Z" });
    const right = run({
      id: "garmin-1",
      source: "garmin",
      startedAt: "2026-10-13T12:00:30.000Z",
      distanceM: 8050,
    });
    expect(sameWorkout(left, right)).toBe(true);
    const merged = mergeActivities([left], [right]);
    const counted = merged.filter((item) => item.disposition !== "excluded");
    expect(counted).toHaveLength(1);
    expect(counted[0]?.id).toBe("strava-1");
    expect(merged.some((item) => item.disposition === "excluded")).toBe(true);
  });

  it("keeps a file import pending and prefers a later recorded copy", () => {
    const file = run({
      id: "file-1",
      source: "garmin",
      provenance: "imported",
      disposition: "pending",
      verified: false,
      startedAt: "2026-10-13T12:00:00.000Z",
    });
    const live = run({ id: "strava-2", startedAt: "2026-10-13T12:00:10.000Z" });
    const merged = mergeActivities([file], [live]);
    expect(merged.find((item) => item.id === "strava-2")?.disposition).toBe("counted");
    expect(merged.find((item) => item.id === "file-1")?.disposition).toBe("excluded");
  });

  it("builds distance and pace trends from counted sessions", () => {
    const trends = progressionTrends(
      [
        run({ id: "a", startedAt: "2026-10-13T12:00:00.000Z", distanceM: 5000, movingSec: 1500 }),
        run({
          id: "b",
          startedAt: "2026-10-13T18:00:00.000Z",
          distanceM: 5000,
          movingSec: 1800,
        }),
        run({
          id: "sample",
          startedAt: "2026-10-14T12:00:00.000Z",
          provenance: "demo",
          source: "history",
        }),
      ],
      "running",
      [{ day: "2026-10-12", elo: 1000 }, { day: "2026-10-19", elo: 1012 }],
    );
    expect(trends.distance).toEqual([{ day: "2026-10-13", value: 10 }]);
    expect(trends.pace[0]?.value).toBe(5.5);
    expect(trends.elo.map((point) => point.value)).toEqual([1000, 1012]);
  });
});
