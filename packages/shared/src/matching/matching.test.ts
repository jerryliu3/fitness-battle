import { describe, expect, it } from "vitest";
import { DensityMatcher } from "./compose";
import { buildLocalBoard, clipFullWeekEstimate } from "./local-view";
import { pickSynthetics, syntheticVolumeInWindow } from "./synthetic-bank";
import type { PoolPlayer } from "./types";
import { DEFAULT_GROUP_CAPACITY } from "./types";
import { waveLengthDays, waveWindowAt, weekEndAfter } from "./waves";

describe("wave windows", () => {
  it("opens the Monday UTC week that contains the instant", () => {
    const monday = waveWindowAt(new Date("2026-10-12T15:00:00.000Z"));
    expect(monday.waveStart.toISOString()).toBe("2026-10-12T00:00:00.000Z");
    expect(monday.weekEnd.toISOString()).toBe("2026-10-19T00:00:00.000Z");
    expect(waveLengthDays(monday)).toBe(7);

    const sunday = waveWindowAt(new Date("2026-10-11T08:00:00.000Z"));
    expect(sunday.waveStart.toISOString()).toBe("2026-10-05T00:00:00.000Z");
    expect(sunday.weekEnd.toISOString()).toBe("2026-10-12T00:00:00.000Z");
    expect(waveLengthDays(sunday)).toBe(7);
  });

  it("weekEndAfter from Saturday is the following Monday", () => {
    const end = weekEndAfter(new Date("2026-10-17T12:00:00.000Z"));
    expect(end.toISOString()).toBe("2026-10-19T00:00:00.000Z");
  });
});

describe("DensityMatcher", () => {
  const matcher = new DensityMatcher({ capacity: DEFAULT_GROUP_CAPACITY });

  it("fills a solo viewer entirely with synthetics", () => {
    const assignment = matcher.assignGroup({
      viewerId: "you",
      viewerName: "You",
      viewerElo: 1000,
      sport: "running",
      now: new Date("2026-10-12T12:00:00.000Z"),
      realPool: [],
      seed: "solo",
    });
    expect(assignment.peers).toHaveLength(0);
    expect(assignment.synthetics).toHaveLength(7);
    expect(assignment.enrollment.syntheticIds).toHaveLength(7);
    expect(assignment.enrollment.capacity).toBe(8);
  });

  it("seats real peers first and fills the rest with synthetics", () => {
    const monday = waveWindowAt(new Date("2026-10-12T12:00:00.000Z"));
    const pool: PoolPlayer[] = [
      {
        id: "real-1",
        name: "Early Bird",
        elo: 1010,
        sport: "running",
        waveStart: monday.waveStart.toISOString(),
        weekEnd: monday.weekEnd.toISOString(),
      },
    ];
    const assignment = matcher.assignGroup({
      viewerId: "you",
      viewerName: "You",
      viewerElo: 1000,
      sport: "running",
      now: new Date("2026-10-12T12:00:00.000Z"),
      realPool: pool,
      seed: "with-real",
    });
    expect(assignment.peers.map((peer) => peer.id)).toEqual(["real-1"]);
    expect(assignment.synthetics).toHaveLength(6);
  });

  it("drops synthetics first when preferReals finds newcomers", () => {
    const wave = waveWindowAt(new Date("2026-10-12T12:00:00.000Z"));
    const initial = matcher.assignGroup({
      viewerId: "you",
      viewerName: "You",
      viewerElo: 1000,
      sport: "running",
      now: new Date("2026-10-12T12:00:00.000Z"),
      realPool: [],
      seed: "refresh",
    });
    expect(initial.synthetics).toHaveLength(7);

    const newcomers: PoolPlayer[] = Array.from({ length: 3 }, (_, index) => ({
      id: `real-${index}`,
      name: `Runner ${index}`,
      elo: 1000 + index,
      sport: "running" as const,
      waveStart: wave.waveStart.toISOString(),
      weekEnd: wave.weekEnd.toISOString(),
    }));

    const refreshed = matcher.preferReals(
      initial.enrollment,
      newcomers,
      "prefer",
    );
    expect(refreshed.peers).toHaveLength(3);
    expect(refreshed.synthetics).toHaveLength(4);
    expect(refreshed.enrollment.peerIds).toHaveLength(3);
    expect(refreshed.enrollment.syntheticIds).toHaveLength(4);
  });
});

describe("local view clipping", () => {
  it("excludes pre-wave distance from peer estimates", () => {
    const waveStart = new Date("2026-10-12T00:00:00.000Z");
    const weekEnd = new Date("2026-10-18T00:00:00.000Z");
    const asOf = new Date("2026-10-13T00:00:00.000Z"); // one day into wave
    const clipped = clipFullWeekEstimate(70, waveStart, weekEnd, asOf);
    expect(clipped).toBeCloseTo(10, 5);
  });

  it("omits activity logged before the Monday week", () => {
    const matcher = new DensityMatcher();
    const week = waveWindowAt(new Date("2026-10-12T12:00:00.000Z"));
    const peer: PoolPlayer = {
      id: "real-1",
      name: "Monday Starter",
      elo: 1000,
      sport: "running",
      waveStart: week.waveStart.toISOString(),
      weekEnd: week.weekEnd.toISOString(),
    };
    const assignment = matcher.assignGroup({
      viewerId: "you",
      viewerName: "You",
      viewerElo: 1000,
      sport: "running",
      now: new Date("2026-10-12T12:00:00.000Z"),
      realPool: [peer],
      seed: "clip",
    });

    // Peer logged a long run on the previous Sunday, plus a Monday run.
    const peerActivities = new Map([
      [
        "real-1",
        [
          {
            id: "sun-run",
            sport: "running" as const,
            startedAt: "2026-10-11T14:00:00.000Z",
            distanceM: 20_000,
            movingSec: 6000,
            avgHr: 150,
            verified: true,
            source: "strava" as const,
          },
          {
            id: "mon-run",
            sport: "running" as const,
            startedAt: "2026-10-12T14:00:00.000Z",
            distanceM: 5000,
            movingSec: 1500,
            avgHr: 145,
            verified: true,
            source: "strava" as const,
          },
        ],
      ],
    ]);

    const board = buildLocalBoard({
      enrollment: assignment.enrollment,
      viewer: {
        id: "you",
        name: "You",
        elo: 1000,
        activities: [],
      },
      peers: assignment.peers,
      peerActivities,
      track: "open",
      asOf: new Date("2026-10-12T18:00:00.000Z"),
    });

    const rival = board.find((row) => row.id === "real-1");
    expect(rival).toBeTruthy();
    expect(rival!.distanceM).toBe(5000);
    expect(rival!.effort).toBeLessThan(6);
  });

  it("synthetic volume only accrues inside the viewer wave", () => {
    const rivals = pickSynthetics("running", 1000, 1, [], "vol");
    const rival = rivals[0]!;
    const before = syntheticVolumeInWindow(
      rival,
      "running",
      new Date("2026-10-12T00:00:00.000Z"),
      new Date("2026-10-18T00:00:00.000Z"),
      "open",
      new Date("2026-10-12T00:00:00.000Z"),
    );
    expect(before.effort).toBe(0);

    const after = syntheticVolumeInWindow(
      rival,
      "running",
      new Date("2026-10-12T00:00:00.000Z"),
      new Date("2026-10-18T00:00:00.000Z"),
      "open",
      new Date("2026-10-15T12:00:00.000Z"),
    );
    expect(after.effort).toBeGreaterThan(0);
    expect(after.distanceM).toBeGreaterThan(0);
  });
});
