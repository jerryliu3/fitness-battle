import { describe, expect, it } from "vitest";
import { freshState, withAccountEloBaseline } from "./compete";
import { effortHistory } from "./effort-history";

describe("shared effort history", () => {
  it("renders guest baseline 500 with current day as the last day of the period", () => {
    const model = effortHistory(freshState(), "open", null);
    expect(model.effectiveElo).toBe(500);
    expect(model.dailyValues).toHaveLength(30);
    expect(model.pts).toHaveLength(30);
    expect(model.lastPoint.x).toBe(model.xEnd);
    expect(model.endDateLabel).not.toContain("Today");
    expect(model.yMin).toBeGreaterThanOrEqual(0);
  });

  it("supports week, month, and year range toggles ending at today", () => {
    const state = freshState();
    state.name = "Alice";
    const week = effortHistory(state, "open", null, null, "week");
    expect(week.dailyValues).toHaveLength(7);
    expect(week.pts).toHaveLength(7);
    expect(week.lastPoint.x).toBe(week.xEnd);
    expect(week.endDateLabel).not.toContain("Today");

    const month = effortHistory(state, "open", null, null, "month");
    expect(month.dailyValues).toHaveLength(30);
    expect(month.pts).toHaveLength(30);
    expect(month.lastPoint.x).toBe(month.xEnd);

    const year = effortHistory(state, "open", null, null, "year");
    expect(year.dailyValues).toHaveLength(52);
    expect(year.pts).toHaveLength(52);
    expect(year.lastPoint.x).toBe(year.xEnd);
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

  it("uses a 30-point rolling window for established athletes ending at today", () => {
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
    expect(model.endDateLabel).not.toContain("Today");
  });

  it("ignores malformed anchor dates instead of crashing either profile renderer", () => {
    const state = freshState();
    state.name = "Alice";
    expect(() =>
      effortHistory(
        state,
        "open",
        { createdAt: "invalid" },
        "alice@example.com",
      ),
    ).not.toThrow();
  });

  it("applies a settled effort-score change on the closed-week boundary, not the week start", () => {
    const state = freshState();
    state.name = "Alice";
    state.demoNow = "2026-10-15T16:00:00Z";
    state.ratings.find((r) => r.sport === state.primary)!.openElo = 1030;
    state.periodResults = [
      {
        id: "result",
        periodStart: "2026-10-05T04:00:00Z",
        periodEnd: "2026-10-12T04:00:00Z",
        sport: state.primary,
        track: "open",
        place: 1,
        fieldSize: 8,
        effort: 10,
        distanceM: 10000,
        movingSec: 3600,
        eloBefore: 1000,
        eloAfter: 1030,
        frozen: false,
        settledAt: "2026-10-12T04:00:00Z",
      },
    ];
    const model = effortHistory(
      state,
      "open",
      { createdAt: "2026-10-05T04:00:00Z" },
      "alice@example.com",
      "month",
    );
    // On 2026-10-15: day 29 is today (1030).
    // Oct 12 is day 26 (1030).
    // Oct 11 is day 25 (1000).
    expect(model.lastPoint.x).toBe(model.xEnd);
    expect(model.dailyValues[29]).toBe(1030);
    expect(model.dailyValues[26]).toBe(1030);
    expect(model.dailyValues[25]).toBe(1000);
  });
});
