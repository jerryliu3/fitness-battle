import { describe, expect, it } from "vitest";
import { freshState, reduceCompete, rollClock } from "./engine";
import { buildSplitBoard, sourceFromLinks } from "./split-board";

describe("buildSplitBoard", () => {
  it("returns empty field until opted in", () => {
    const state = rollClock(freshState(), new Date("2026-10-13T12:00:00.000Z"));
    const board = buildSplitBoard(state, "running", "open", new Date("2026-10-13T12:00:00.000Z"));
    expect(board.optedIn).toBe(false);
    expect(board.rows).toHaveLength(0);
  });

  it("builds lanes after opt-in", () => {
    const now = new Date("2026-10-13T12:00:00.000Z");
    let state = rollClock(freshState(), now);
    state = reduceCompete(state, { type: "opt-in", sport: "running" }, now);
    const board = buildSplitBoard(state, "running", "open", now);
    expect(board.optedIn).toBe(true);
    expect(board.rows.length).toBeGreaterThan(0);
    expect(board.you?.you).toBe(true);
  });

  it("sourceFromLinks reports stub vs live", () => {
    expect(sourceFromLinks([])).toEqual({
      status: "disconnected",
      label: "Link source",
    });
    expect(
      sourceFromLinks([{ provider: "strava", linked: true, status: "stub" }]),
    ).toEqual({ status: "stub", label: "Demo source" });
    expect(
      sourceFromLinks([{ provider: "strava", linked: true, status: "connected" }]),
    ).toEqual({ status: "connected", label: "Strava live" });
  });
});
