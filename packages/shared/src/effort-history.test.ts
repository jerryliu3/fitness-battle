import { describe, expect, it } from "vitest";
import { effortHistory } from "./effort-history";
import { freshState, withAccountEloBaseline } from "./compete";
describe("shared effort history", () => {
  it("renders guest baseline 500 with a full axis and a one-day leading gap", () => {
    const model = effortHistory(freshState(), "open", null);
    expect(model.effectiveElo).toBe(500);
    expect(model.pts).toHaveLength(2);
    expect(model.lastPoint.x).toBeGreaterThan(model.xStart);
    expect(model.yMin).toBeGreaterThanOrEqual(0);
  });
  it("supports both tracks and the signed-in baseline without inventing results", () => {
    const state = withAccountEloBaseline(freshState());
    state.name = "Alice";
    state.ratings.find((r) => r.sport === state.primary)!.verifiedElo = 1130;
    expect(
      effortHistory(state, "open", {}, "alice@example.com").effectiveElo,
    ).toBe(1000);
    expect(
      effortHistory(state, "verified", {}, "alice@example.com").effectiveElo,
    ).toBe(1130);
    expect(state.periodResults).toHaveLength(0);
  });
  it("uses a 30-point rolling window for established athletes", () => {
    const state = freshState();
    state.name = "Alice";
    const model = effortHistory(
      state,
      "open",
      { createdAt: "2025-01-01T12:00:00Z" },
      "alice@example.com",
    );
    expect(model.dailyValues).toHaveLength(30);
    expect(model.lastPoint.x).toBe(model.xEnd);
    expect(model.endDateLabel).toContain("Today");
  });
});
