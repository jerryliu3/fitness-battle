import { describe, expect, it } from "vitest";
import { freshState } from "./compete/engine";
import { countsForTraining } from "./compete/journal";
import { buildAnalyticsLabModel } from "./analytics-lab";
import type { CompeteState } from "./compete/sports";

describe("analytics-lab from compete state", () => {
  it("allocates market holdings from recorded activities", () => {
    const now = new Date("2026-10-25T12:00:00-04:00");
    const state = freshState(now);
    state.calibrated = true;
    const activity = {
      id: "run-1",
      sport: "running" as const,
      source: "garmin" as const,
      startedAt: "2026-10-24T10:00:00Z",
      distanceM: 10000,
      movingSec: 3600,
      avgHr: 150,
      verified: true,
    };
    expect(countsForTraining(activity)).toBe(true);
    state.activities = [activity];
    const model = buildAnalyticsLabModel(state, "30d");
    expect(model.market.holdings.some((h) => h.ticker === "RUN")).toBe(true);
  });

  it("uses cast test fixtures with the same activity shape", () => {
    const healthyState = {
      calibrated: true,
      activities: [
        { id: "a1", sport: "running", source: "garmin", startedAt: new Date().toISOString(), distanceM: 12000, movingSec: 7200, avgHr: 150, verified: true },
        { id: "a2", sport: "running", source: "garmin", startedAt: new Date().toISOString(), distanceM: 12000, movingSec: 7200, avgHr: 150, verified: true },
      ],
    } as unknown as CompeteState;
    const model = buildAnalyticsLabModel(healthyState, "30d");
    expect(model.market.holdings.find((h) => h.ticker === "RUN")?.hours).toBe(4);
  });
});