import { describe, expect, it } from "vitest";
import { mapOwHealthScoreToReadiness, mapOwWorkoutToActivity } from "./open-wearables-map";

describe("open wearables mappers", () => {
  it("maps a whoop run workout into an activity sample", () => {
    const sample = mapOwWorkoutToActivity({
      id: "w-1",
      type: "running",
      name: null,
      start_time: "2026-10-01T12:00:00Z",
      end_time: "2026-10-01T12:40:00Z",
      duration_seconds: 2400,
      distance_meters: 8000,
      avg_heart_rate_bpm: 150,
      source: { provider: "whoop" },
    });
    expect(sample).toMatchObject({
      provider: "whoop",
      externalId: "w-1",
      categorySlug: "running",
      metricValue: 8000,
      movingSec: 2400,
      avgHr: 150,
    });
  });

  it("drops workouts from other providers", () => {
    expect(
      mapOwWorkoutToActivity({
        id: "w-2",
        type: "running",
        start_time: "2026-10-01T12:00:00Z",
        end_time: "2026-10-01T12:40:00Z",
        source: { provider: "strava" },
      }),
    ).toBeNull();
  });

  it("maps recovery health scores", () => {
    const ready = mapOwHealthScoreToReadiness({
      id: "r-1",
      date: "2026-10-01",
      score_type: "recovery",
      value: 72,
      provider: "whoop",
    });
    expect(ready).toEqual({
      id: "whoop-ow-ready-r-1",
      provider: "whoop",
      externalId: "r-1",
      day: "2026-10-01",
      score: 72,
    });
  });
});
