import { describe, expect, it } from "vitest";
import { nextDailyWaveWindowAt, weeklyWaveWindowAt, instantWaveWindowAt } from "./waves";
import { DensityMatcher } from "./compose";
import { syntheticBank, syntheticVolumeInWindow } from "./synthetic-bank";
import { freshState, projectedElo, reduceCompete, rollClock, weeklyBoard } from "../compete/engine";
import { competitionQueue, normalizeNewRegistrations, openEnrollmentRemoved } from "../compete/participation";
import { applyRemoteSnapshot } from "../compete/snapshot";

describe("daily Eastern competition waves", () => {
  it.each([
    ["2026-10-28T09:59:59Z", "2026-10-28T10:00:00.000Z", "2026-11-02T05:00:00.000Z"],
    ["2026-10-28T10:00:00Z", "2026-10-28T10:00:00.000Z", "2026-11-02T05:00:00.000Z"],
    ["2026-10-28T10:00:01Z", "2026-10-29T10:00:00.000Z", "2026-11-02T05:00:00.000Z"],
    ["2026-11-01T05:30:00Z", "2026-11-01T11:00:00.000Z", "2026-11-02T05:00:00.000Z"],
    ["2026-03-08T06:30:00Z", "2026-03-08T10:00:00.000Z", "2026-03-09T04:00:00.000Z"],
    ["2026-11-01T11:00:01Z", "2026-11-02T11:00:00.000Z", "2026-11-09T05:00:00.000Z"],
  ])("queues %s at the next six o'clock (%s)", (at, start, end) => {
    const wave = nextDailyWaveWindowAt(new Date(at));
    expect(wave.waveStart.toISOString()).toBe(start);
    expect(wave.weekEnd.toISOString()).toBe(end);
  });

  it("hides the board, counts no earlier activity and allows cancellation without a result", () => {
    const at = "2026-10-28T09:00:00Z";
    const state = reduceCompete(freshState(new Date(at)), { type: "opt-in", sport: "running", now: at });
    const logged = reduceCompete(state, { type: "log-manual", sport: "running", distanceM: 10000, movingSec: 3600, activityId: "before-start", now: at });
    expect(weeklyBoard(logged, "running", "open", new Date(at))).toEqual([]);
    expect(projectedElo(logged, "running", "open", new Date(at))).toBe(logged.ratings.find(r => r.sport === "running")!.openElo);
    expect(logged.ratings).toEqual(state.ratings);
    expect(competitionQueue(logged, "running", new Date(at))).toMatchObject({ queued: true, mysteryCount: 7 });
    const left = reduceCompete(logged, { type: "opt-out", sport: "running", now: at });
    expect(left.enrollments).toEqual([]);
    expect(left.periodResults).toEqual([]);
    expect(openEnrollmentRemoved(logged, left, new Date(at))).toBe(false);
    const starts = new Date(state.enrollments[0]!.waveStart);
    expect(weeklyBoard(logged, "running", "open", starts).every(row => row.distanceM === 0)).toBe(true);
    const after = reduceCompete(logged, { type: "log-manual", sport: "running", distanceM: 5000, movingSec: 1800, activityId: "at-start", now: starts.toISOString() });
    expect(weeklyBoard(after, "running", "open", new Date(starts.getTime() + 1)).find(row => row.you)?.distanceM).toBe(5000);
    expect(reduceCompete(after, { type: "opt-out", sport: "running", now: starts.toISOString() }).enrollments).toEqual(after.enrollments);
    expect(openEnrollmentRemoved(after, { ...after, enrollments: [] }, starts)).toBe(true);
  });

  it("renews on Monday six, with a midnight-to-six queue and DST-aware end", () => {
    const at = "2026-10-28T09:00:00Z";
    const joined = reduceCompete(freshState(new Date(at)), { type: "opt-in", sport: "running", now: at });
    const closed = rollClock(joined, new Date("2026-11-02T05:00:00Z"));
    expect(closed.periodResults).toHaveLength(2);
    expect(closed.enrollments[0]).toMatchObject({ waveStart: "2026-11-02T11:00:00.000Z", weekEnd: "2026-11-09T05:00:00.000Z" });
    expect(weeklyBoard(closed, "running", "open", new Date("2026-11-02T10:59:59Z"))).toEqual([]);
    expect(weeklyWaveWindowAt(new Date("2026-11-05T15:00:00Z")).waveStart.toISOString()).toBe("2026-11-02T11:00:00.000Z");
  });

  it("does not settle a configured account until its canonical roster has loaded", () => {
    const at = "2026-10-28T09:00:00Z";
    const state = reduceCompete({ ...freshState(new Date(at)), requiresCanonicalFields: true }, { type: "opt-in", sport: "running", now: at });
    expect(rollClock(state, new Date("2026-11-02T12:00:00Z")).periodResults).toEqual([]);
    expect(weeklyBoard(state, "running", "open", new Date("2026-10-29T12:00Z"))).toEqual([]);
    expect(projectedElo(state, "running", "open", new Date("2026-10-29T12:00Z"))).toBe(state.ratings.find(r => r.sport === "running")!.openElo);
  });

  it("rebases an unsaved registration across the cutoff using the server clock", () => {
    const at = "2026-10-28T09:59:59Z";
    const state = reduceCompete(freshState(new Date(at)), { type: "opt-in", sport: "running", now: at });
    const normalized = normalizeNewRegistrations(state, null, new Date("2026-10-28T10:00:01Z"));
    expect(normalized.enrollments[0]!.waveStart).toBe("2026-10-29T10:00:00.000Z");
    expect(normalized.ratings[0]!.lockPeriod).toBe(normalized.enrollments[0]!.waveStart);
    expect(normalizeNewRegistrations(state, state, new Date("2026-10-28T10:00:01Z"))).toBe(state);
  });

  it("retains immediate grouping with a derived window and the ordinary enrollment shape", () => {
    const at = new Date("2026-10-28T15:42:00Z");
    const assignment = new DensityMatcher().assignGroup({ viewerId: "a", viewerName: "A", viewerElo: 1000, sport: "running", window: instantWaveWindowAt(at) });
    expect(assignment.enrollment.waveStart).toBe(at.toISOString());
    expect(assignment.enrollment.weekEnd).toBe("2026-11-02T05:00:00.000Z");
  });

  it("does not give generated competitors a whole day's distance as soon as the wave opens", () => {
    const wave = nextDailyWaveWindowAt(new Date("2026-10-28T09:00Z"));
    for (const rival of syntheticBank("running")) {
      expect(syntheticVolumeInWindow(rival, "running", wave.waveStart, wave.weekEnd, "open", wave.waveStart).distanceM).toBe(0);
      const oneSecond = syntheticVolumeInWindow(rival, "running", wave.waveStart, wave.weekEnd, "open", new Date(wave.waveStart.getTime() + 1000));
      expect(oneSecond.distanceM).toBeLessThan(1);
    }
  });

  it("restores a cancellation rejected at the start without undoing other unsaved edits", () => {
    const at = "2026-10-28T09:59:59Z";
    const remote = reduceCompete({ ...freshState(new Date(at)), requiresCanonicalFields: true }, { type: "opt-in", sport: "running", now: at });
    const cancelled = reduceCompete(remote, { type: "opt-out", sport: "running", now: at });
    const local = { ...cancelled, name: "Unsaved name", demoNow: "2026-10-28T10:00:01Z" };
    const restored = applyRemoteSnapshot(local, remote, true);
    expect(restored.name).toBe("Unsaved name");
    expect(restored.enrollments[0]!.waveStart).toBe(remote.enrollments[0]!.waveStart);
    expect(restored.ratings.find(r => r.sport === "running")!.optedIn).toBe(true);
    expect(applyRemoteSnapshot({ ...local, demoNow: at }, remote, true).enrollments).toEqual([]);
    const recovery = reduceCompete(remote, { type: "opt-in-health", metric: "sleep", now: at });
    const stopping = reduceCompete({ ...recovery, demoNow: local.demoNow }, { type: "schedule-leave", metric: "sleep", now: local.demoNow });
    expect(applyRemoteSnapshot(stopping, recovery, true).healthRatings.find(r => r.metric === "sleep")!.autoEnrollNext).toBe(false);
  });
});
