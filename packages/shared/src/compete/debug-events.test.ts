import { describe, expect, it } from "vitest";
import {
  arenaBaselineStorageKey,
  formatArenaOvertakeStatus,
  readArenaBaseline,
  reconcileArenaOvertake,
  stepArenaOvertake,
  type ArenaSceneLane,
} from "../arena-view";
import { buildArenaModel, competePeriodWindow } from "../phone-views";
import { applyDebugEvent, DEBUG_EVENT_OPTIONS } from "./debug-events";
import { competeNow, freshState } from "./engine";
import { competitionTrack } from "./sports";
import { roundReveal } from "./round-reveal";
import { initialsFromName } from "./track";

function sceneLanesFromState(state: ReturnType<typeof freshState>) {
  const now = competeNow(state);
  const arena = buildArenaModel(state, now, competitionTrack(state.primary), state.primary);
  const periodStart = competePeriodWindow(state, now, state.primary).startsAt.toISOString();
  const lanes: ArenaSceneLane[] = arena.lanes.filter((l) => !l.ghost).map((l) => ({
    id: l.id,
    name: l.name,
    initials: initialsFromName(l.name),
    value: l.values[2],
    you: l.you,
  }));
  return { lanes, periodStart, unit: arena.unit };
}

describe("applyDebugEvent", () => {
  it("exposes all four primary UI event mechanisms", () => {
    expect(DEBUG_EVENT_OPTIONS.map((o) => o.id)).toEqual(["sync-activity", "sync-combo", "overtake", "overtake-combo", "overtaken", "week-closing"]);
  });

  it("simulates a new synced activity with forward Arena movement and Today reveal", () => {
    const result = applyDebugEvent(freshState(new Date("2026-10-21T15:00:00.000Z")), "sync-activity", "guest", 1);
    expect(result.targetRoute).toBe("/today");
    expect(result.revealStopKey).toMatch(/^today:/);
    expect(result.state.activities[0]?.verified).toBe(true);
    const { lanes, periodStart, unit } = sceneLanesFromState(result.state);
    const prev = readArenaBaseline(result.baselines[arenaBaselineStorageKey("guest", result.state.primary, competitionTrack(result.state.primary))] ?? null, periodStart, unit);
    const plan = reconcileArenaOvertake(lanes, prev);
    expect(plan?.hasOvertake).toBe(false);
    expect(plan!.youAfter).toBeGreaterThan(plan!.youBefore);
  });

  it("simulates overtaking and getting overtaken on consecutive triggers", () => {
    let current = freshState(new Date("2026-10-21T15:00:00.000Z"));
    for (let step = 1; step <= 4; step += 1) {
      const result = applyDebugEvent(current, "overtake", "guest", step);
      const { lanes, periodStart, unit } = sceneLanesFromState(result.state);
      const prev = readArenaBaseline(result.baselines[arenaBaselineStorageKey("guest", result.state.primary, competitionTrack(result.state.primary))] ?? null, periodStart, unit);
      const plan = reconcileArenaOvertake(lanes, prev);
      expect(plan?.hasOvertake).toBe(true);
      expect(plan!.rankAfter).toBeLessThan(plan!.rankBefore);
      current = result.state;
    }

    for (let step = 1; step <= 4; step += 1) {
      const result = applyDebugEvent(current, "overtaken", "guest", step);
      const { lanes, periodStart, unit } = sceneLanesFromState(result.state);
      const prev = readArenaBaseline(result.baselines[arenaBaselineStorageKey("guest", result.state.primary, competitionTrack(result.state.primary))] ?? null, periodStart, unit);
      const plan = reconcileArenaOvertake(lanes, prev);
      expect(plan?.passedByIds?.length).toBeGreaterThanOrEqual(1);
      expect(plan!.rankAfter).toBeGreaterThan(plan!.rankBefore);
      expect(formatArenaOvertakeStatus(plan!, stepArenaOvertake(plan!, 0.5, 6), unit).headline).toMatch(/making a move/);
      expect(formatArenaOvertakeStatus(plan!, null, unit).detail).toMatch(/passed/);
      current = result.state;
    }
  });

  it("simulates week closing with a settled period result ready for RoundTakeover", () => {
    const result = applyDebugEvent(freshState(new Date("2026-10-21T15:00:00.000Z")), "week-closing", "guest", 1);
    expect(result.targetRoute).toBe("/arena?results=latest");
    const reveal = roundReveal(result.state);
    expect(reveal?.results[0]?.distanceM).toBeGreaterThan(0);
  });
});

it("provides a multi-pass sync fixture with two inspectable GPS routes", () => {
  const result = applyDebugEvent(freshState(new Date("2026-10-24T18:00:00Z")), "sync-combo", "guest", 2);
  expect(result.state.activities).toHaveLength(2);
  expect(result.state.activities.every(a => a.summaryPolyline && a.detailedPolyline)).toBe(true);
  expect(result.state.activities[0].summaryPolyline).not.toBe(result.state.activities[1].summaryPolyline);
  const { lanes, periodStart, unit } = sceneLanesFromState(result.state);
  const previous = readArenaBaseline(result.baselines[arenaBaselineStorageKey("guest", result.state.primary, competitionTrack(result.state.primary))], periodStart, unit);
  expect(reconcileArenaOvertake(lanes, previous)?.overtakenIds.length).toBeGreaterThanOrEqual(2);
});
