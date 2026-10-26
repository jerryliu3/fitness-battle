import { expect, it } from "vitest";
import { applyDebugEvent } from "./compete/debug-events";
import { freshState } from "./compete/engine";
import { competitionMoments, competitionMomentScene, competitionMomentSnapshots, momentStorageKey, photoFinishFrame, selectedSyncActions } from "./competition-moments";
const pinned = new Date("2026-10-24T18:00:00Z");
const state = { ...freshState(pinned), demoNow: pinned.toISOString() };
function fixture(event: "overtake" | "overtaken") {
  const result = applyDebugEvent(state, event, "a");
  const baseline = Object.fromEntries(Object.entries(result.baselines).map(([k, v]) => [momentStorageKey(k), v]));
  return { result, moments: competitionMoments(result.state, "a", k => baseline[k] ?? null) };
}
it("detects both directions independently of the selected tab and never reveals first-load fields", () => {
  for (const event of ["overtake", "overtaken"] as const) {
    const { result, moments } = fixture(event);
    expect(moments).toHaveLength(1);
    expect(event === "overtake" ? moments[0].plan.hasOvertake : moments[0].plan.passedByIds?.length).toBeTruthy();
    expect(competitionMoments(result.state, "a", () => null)).toEqual([]);
    const saved = Object.fromEntries(competitionMomentSnapshots(result.state, "a").map(s => [s.key, s.value]));
    expect(competitionMoments(result.state, "a", k => saved[k])).toEqual([]);
    expect(competitionMoments(result.state, "b", k => saved[k])).toEqual([]);
  }
});
it("finishes at the actual totals and counts each crossing exactly once in either direction", () => {
  for (const direction of ["overtake", "overtaken"] as const) {
    const moment = fixture(direction).moments[0];
    const frames = Array.from({ length: 101 }, (_, i) => photoFinishFrame(moment, i / 100));
    expect(frames[0].count).toBe(0);
    expect(frames[100].count).toBeGreaterThan(0);
    expect(frames[100].youValue).toBeCloseTo(moment.plan.youAfter);
    expect(frames[100].rank).toBe(moment.plan.rankAfter);
    expect(frames.every((f, i) => i === 0 || f.count >= frames[i - 1].count)).toBe(true);
    expect(Math.max(...frames.map(f => f.focus))).toBeGreaterThan(.5);
  }
});
it("marks deselected incoming activity excluded before scoring and preserves GPS geometry", () => {
  const result = applyDebugEvent(state, "sync-activity", "a");
  const activities = result.state.activities;
  const actions = selectedSyncActions([{ type: "apply-sync", provider: "strava", activities }], []);
  expect(actions.find(a => a.type === "apply-sync")?.activities?.every(a => a.disposition === "excluded")).toBe(true);
  expect(selectedSyncActions([{ type: "apply-sync", activities }], activities.map(a => a.id))[0].activities).toEqual(activities);
});

it("queues rival movement and own passes separately when they arrive together", () => {
  const { result } = fixture("overtake");
  const snapshot = competitionMomentSnapshots(result.state, "a")[0];
  const you = snapshot.lanes.find(l => l.you)!;
  const ahead = snapshot.lanes.find(l => !l.you && l.value > you.value)!;
  const baseline = JSON.parse(result.baselines[snapshot.arenaKey]);
  baseline.values[ahead.id] = 0;
  const modified = JSON.stringify(baseline);
  const moments = competitionMoments(result.state, "a", key => key === snapshot.key ? modified : null);
  expect(moments.map(m => m.plan.hasOvertake)).toEqual([false, true]);
  expect(moments[0].plan.rankAfter).toBe(moments[1].plan.rankBefore);
  expect(photoFinishFrame(moments[1], 1).rank).toBe(moments[1].plan.rankAfter);
});

it("replays every captured lane, follows real totals and preserves stable lane identity", () => {
  for (const direction of ["overtake", "overtaken"] as const) {
    const moment = fixture(direction).moments[0];
    for (const progress of [0, .3, .5, .8, 1]) {
      const scene = competitionMomentScene(moment, progress);
      expect(scene.lanes.map(l => l.id)).toEqual(moment.lanes.map(l => l.id));
      expect(scene.view.center).toBe(scene.youValue);
      expect(scene.view.span).toBeGreaterThan(0);
      for (const lane of scene.lanes) expect(lane.value).toBe(scene.values[lane.id] ?? moment.lanes.find(l => l.id === lane.id)!.value);
      expect(scene.standings.some(l => l.you)).toBe(true);
      expect(scene.standings.find(l => l.you)?.place).toBe(scene.rank);
    }
  }
});
