import { describe, expect, it } from "vitest";
import { freshState, reduceCompete, rollClock } from "./engine";
import { applyRemoteSnapshot, chooseCompeteState } from "./snapshot";

describe("chooseCompeteState", () => {
  it("keeps the device copy when it is newer than the server", () => {
    const local = freshState(new Date("2026-10-13T00:00:00.000Z"));
    const remote = freshState(new Date("2026-10-12T00:00:00.000Z"));
    remote.name = "Server";
    const chosen = chooseCompeteState(
      { savedAt: "2026-10-14T00:00:00.000Z", state: { ...local, name: "Device" } },
      { updatedAt: "2026-10-13T00:00:00.000Z", state: remote },
    );
    expect(chosen.name).toBe("Device");
  });

  it("replaces the device copy when the server snapshot is newer", () => {
    const local = freshState();
    const remote = { ...freshState(), name: "Server" };
    const chosen = chooseCompeteState(
      { savedAt: "2026-10-12T00:00:00.000Z", state: local },
      { updatedAt: "2026-10-13T00:00:00.000Z", state: remote },
    );
    expect(chosen.name).toBe("Server");
  });
});

describe("applyRemoteSnapshot", () => {
  it("merges a Recovery rollover without losing its result or unsaved renewal preference", () => {
    const joined = reduceCompete(freshState(new Date("2026-10-28T09:00Z")), { type: "opt-in-health", metric: "sleep", now: "2026-10-28T09:00Z" });
    const local = { ...joined, name: "Unsaved name", demoNow: "2026-11-02T12:00:00Z", requiresCanonicalFields: true,
      healthRatings: joined.healthRatings.map(r => ({ ...r, autoEnrollNext: false })) };
    const remote = { ...rollClock(joined, new Date(local.demoNow)), requiresCanonicalFields: true };
    const merged = applyRemoteSnapshot(local, remote, true);
    expect(merged.healthRatings[0]).toEqual({ ...remote.healthRatings[0], autoEnrollNext: false });
    expect(merged.healthResults).toEqual(remote.healthResults);
    expect(merged.name).toBe("Unsaved name");
  });

  it("adopts a server rollover and settled ratings while keeping unsaved profile and renewal edits", () => {
    const joined = reduceCompete(freshState(new Date("2026-10-28T09:00Z")), { type: "opt-in", sport: "running", now: "2026-10-28T09:00Z" });
    const local = { ...joined, name: "Unsaved name", demoNow: "2026-11-02T12:00:00Z", requiresCanonicalFields: true,
      enrollments: joined.enrollments.map(e => ({ ...e, awaitingField: true, autoEnrollNext: false })) };
    const remote = { ...rollClock(joined, new Date(local.demoNow)), requiresCanonicalFields: true };
    const merged = applyRemoteSnapshot(local, remote, true);
    expect(merged.name).toBe("Unsaved name");
    expect(merged.enrollments[0]!.waveStart).toBe(remote.enrollments[0]!.waveStart);
    expect(merged.enrollments[0]!.autoEnrollNext).toBe(false);
    expect(merged.ratings).toEqual(remote.ratings);
    expect(merged.periodResults).toEqual(remote.periodResults);
    expect(merged.pendingRevealIds).toEqual(remote.pendingRevealIds);
  });

  it("folds remote field peers and crew board into dirty local copy while preserving local autoEnrollNext", () => {
    const nowIso = "2026-10-14T12:00:00.000Z";
    const waveStart = "2026-10-12T04:00:00.000Z";
    const weekEnd = "2026-10-19T04:00:00.000Z";
    const local = { ...freshState(new Date(nowIso)), demoNow: nowIso };
    local.enrollments = [
      {
        sport: "running",
        waveStart,
        weekEnd,
        capacity: 8,
        peerIds: [],
        syntheticIds: ["syn-1"],
        autoEnrollNext: false, // user opted to stop after this week
      },
    ];

    const remote = { ...freshState(new Date(nowIso)), demoNow: nowIso };
    remote.enrollments = [
      {
        sport: "running",
        waveStart,
        weekEnd,
        capacity: 8,
        peerIds: ["peer-1", "peer-2"],
        syntheticIds: ["syn-9"],
        autoEnrollNext: true,
      },
    ];
    remote.crewBoard = {
      crewId: "solo",
      crewName: "Open Field",
      sport: "running",
      waveStart,
      weekEnd,
      capacity: 8,
      memberIds: ["you", "peer-1", "peer-2"],
      members: [
        { id: "peer-1", name: "Peer One", elo: 1000, distanceM: 5000, movingSec: 1500 },
        { id: "peer-2", name: "Peer Two", elo: 1020, distanceM: 6000, movingSec: 1800 },
      ],
      syntheticIds: ["syn-9"],
    };

    const merged = applyRemoteSnapshot(local, remote, true);
    expect(merged.crewBoard).toEqual(remote.crewBoard);
    expect(merged.enrollments[0]?.peerIds).toEqual(["peer-1", "peer-2"]);
    expect(merged.enrollments[0]?.syntheticIds).toEqual(["syn-9"]);
    // Local user's preference to stop after this week was preserved
    expect(merged.enrollments[0]?.autoEnrollNext).toBe(false);
  });

  it("keeps athlete_prefs units from the server when folding a dirty local copy", () => {
    const local = { ...freshState(), units: "us" as const };
    const remote = { ...freshState(), units: "metric" as const };
    const merged = applyRemoteSnapshot(local, remote, true);
    expect(merged.units).toBe("metric");
  });

  it("holds local units only while a units edit is still unsaved", () => {
    const local = { ...freshState(), units: "metric" as const };
    const remote = { ...freshState(), units: "us" as const };
    expect(applyRemoteSnapshot(local, remote, true, true).units).toBe("metric");
    expect(applyRemoteSnapshot(local, remote, true, false).units).toBe("us");
  });
});
