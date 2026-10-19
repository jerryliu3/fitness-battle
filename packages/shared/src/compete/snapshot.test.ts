import { describe, expect, it } from "vitest";
import { freshState } from "./engine";
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
});
