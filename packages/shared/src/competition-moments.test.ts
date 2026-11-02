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
      expect(scene.replayFocusIds).toContain(moment.plan.youId);
      for (const id of scene.replayFocusIds) expect(Math.abs(scene.values[id]-scene.view.center)).toBeLessThan(scene.view.span/2);
      expect(scene.view.span).toBeGreaterThan(0);
      for (const lane of scene.lanes) expect(lane.value).toBe(scene.values[lane.id] ?? moment.lanes.find(l => l.id === lane.id)!.value);
      expect(scene.standings.some(l => l.you)).toBe(true);
      expect(scene.standings.find(l => l.you)?.place).toBe(scene.rank);
    }
  }
});

it("pulses every successful crossing briefly, then clears effects at completion and for losses", () => {
  const moment = fixture("overtake").moments[0];
  const seen = new Set<string>();
  for (let step=0;step<=1000;step++) {
    const frame = photoFinishFrame(moment,step/1000);
    for (const pass of frame.passEffects) {
      seen.add(pass.id);
      expect(frame.values[pass.id]).toBeLessThan(frame.youValue);
      expect(pass.strength).toBeGreaterThan(0);
      expect(pass.strength).toBeLessThanOrEqual(1);
    }
  }
  expect([...seen].sort()).toEqual([...moment.plan.overtakenIds].sort());
  expect(photoFinishFrame(moment,1).passEffects).toEqual([]);
  const loss = fixture("overtaken").moments[0];
  for (let step=0;step<=100;step++) expect(photoFinishFrame(loss,step/100).passEffects).toEqual([]);
});

it("keeps the zoom envelope continuous through rival handoffs and the ending hold", () => {
  for (const direction of ["overtake", "overtaken"] as const) {
    const moment = fixture(direction).moments[0];
    let previous = photoFinishFrame(moment, 0).focus;
    for (let i = 1; i <= 2000; i++) {
      const focus = photoFinishFrame(moment, i / 2000).focus;
      expect(Math.abs(focus - previous)).toBeLessThan(.04);
      previous = focus;
    }
  }
});

it("converts committed replay distances without changing the count or ranking", async () => {
  const { overtakeMomentForUnits } = await import("./competition-moments");
  const moment = fixture("overtake").moments[0];
  const metric = { ...moment, unit: "km" as const };
  const display = overtakeMomentForUnits(metric, "us");
  expect(display.unit).toBe("mi");
  expect(display.plan.overtakenIds).toEqual(metric.plan.overtakenIds);
  expect(display.plan.rankAfter).toBe(metric.plan.rankAfter);
  expect(display.plan.youAfter).toBeCloseTo(metric.plan.youAfter / 1.609344);
  expect(display.lanes[0].value).toBeCloseTo(metric.lanes[0].value / 1.609344);
  expect(overtakeMomentForUnits(metric, "metric")).toBe(metric);
});

it("replays positive distance without a pass and finishes at the updated field position", () => {
  const { result } = fixture("overtake");
  const snapshot = competitionMomentSnapshots(result.state, "a")[0];
  const baseline = JSON.parse(snapshot.value);
  const you = snapshot.lanes.find(lane => lane.you)!;
  baseline.values[you.id] = you.value - .05;
  const moments = competitionMoments(result.state, "a", key => key === snapshot.key ? JSON.stringify(baseline) : null);
  expect(moments).toHaveLength(1);
  const moment = moments[0];
  expect(moment.plan.hasOvertake).toBe(false);
  expect(moment.plan.rankBefore).toBe(moment.plan.rankAfter);
  expect(competitionMomentScene(moment, 0).youValue).toBeCloseTo(you.value - .05);
  expect(competitionMomentScene(moment, .5).youValue).toBeGreaterThan(you.value - .05);
  expect(competitionMomentScene(moment, 1).youValue).toBe(you.value);
  expect(photoFinishFrame(moment, 1).count).toBe(0);
});

it("captures every sport in a single sync, with independent baselines and crossing counts", () => {
  const running = applyDebugEvent({ ...state, primary: "running" }, "overtake", "a");
  const cycling = applyDebugEvent({ ...state, primary: "cycling" }, "overtake", "a");
  const combined = { ...running.state,
    ratings: running.state.ratings.map(r => r.sport === "cycling" ? cycling.state.ratings.find(c => c.sport === "cycling")! : r),
    enrollments: [...running.state.enrollments, ...cycling.state.enrollments],
    activities: [...running.state.activities, ...cycling.state.activities],
  };
  const baselines = Object.fromEntries(Object.entries({ ...running.baselines, ...cycling.baselines }).map(([key, value]) => [momentStorageKey(key), value]));
  const moments = competitionMoments(combined, "a", key => baselines[key]);
  expect(moments.map(moment => moment.sport)).toEqual(["running", "cycling"]);
  expect(moments.every(moment => moment.plan.hasOvertake)).toBe(true);
  expect(new Set(moments.map(moment => moment.id)).size).toBe(2);
  for (const moment of moments) expect(photoFinishFrame(moment, 1).youValue).toBe(moment.plan.youAfter);
});

it("converts retained display receipts back to metric without changing their identity", async () => {
  const { overtakeMomentForUnits } = await import("./competition-moments");
  const original = { ...fixture("overtake").moments[0], unit: "km" as const };
  const restored = overtakeMomentForUnits(overtakeMomentForUnits(original, "us"), "metric");
  expect(restored.unit).toBe("km");
  expect(restored.id).toBe(original.id);
  expect(restored.plan.youAfter).toBeCloseTo(original.plan.youAfter);
  expect(restored.lanes[0].value).toBeCloseTo(original.lanes[0].value);
});
