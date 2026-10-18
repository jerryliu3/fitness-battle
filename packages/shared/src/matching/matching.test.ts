import { describe, expect, it } from "vitest";
import { DensityMatcher } from "./compose";
import {
  enrollmentFromCrewPlan,
  planCrewWeekField,
} from "./crew-field";
import { planWeekField, fieldPinMatchesEnrollment } from "./field-plan";
import { buildLocalBoard, clipFullWeekEstimate } from "./local-view";
import { pickSynthetics, syntheticVolumeInWindow } from "./synthetic-bank";
import type { PoolPlayer } from "./types";
import { DEFAULT_GROUP_CAPACITY } from "./types";
import { waveLengthDays, waveWindowAt, weekEndAfter } from "./waves";

describe("wave windows", () => {
  it("opens the Monday America/New_York week that contains the instant", () => {
    const monday = waveWindowAt(new Date("2026-10-12T15:00:00.000Z"));
    expect(monday.waveStart.toISOString()).toBe("2026-10-12T04:00:00.000Z");
    expect(monday.weekEnd.toISOString()).toBe("2026-10-19T04:00:00.000Z");
    expect(waveLengthDays(monday)).toBe(7);

    const sunday = waveWindowAt(new Date("2026-10-11T08:00:00.000Z"));
    expect(sunday.waveStart.toISOString()).toBe("2026-10-05T04:00:00.000Z");
    expect(sunday.weekEnd.toISOString()).toBe("2026-10-12T04:00:00.000Z");
    expect(waveLengthDays(sunday)).toBe(7);
  });

  it("weekEndAfter from Saturday is the following Monday", () => {
    const end = weekEndAfter(new Date("2026-10-17T12:00:00.000Z"));
    expect(end.toISOString()).toBe("2026-10-19T04:00:00.000Z");
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

  it("seats forced crew peers before density picks and synthetics", () => {
    const monday = waveWindowAt(new Date("2026-10-12T12:00:00.000Z"));
    const forced: PoolPlayer[] = [
      {
        id: "mate-a",
        name: "Mate A",
        elo: 900,
        sport: "running",
        waveStart: monday.waveStart.toISOString(),
        weekEnd: monday.weekEnd.toISOString(),
      },
      {
        id: "mate-b",
        name: "Mate B",
        elo: 1100,
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
      forcedPeers: forced,
      realPool: [],
      seed: "crew:test:running",
      crewId: "crew-1",
    });
    expect(assignment.peers.map((peer) => peer.id)).toEqual(["mate-a", "mate-b"]);
    expect(assignment.synthetics).toHaveLength(5);
    expect(assignment.enrollment.crewId).toBe("crew-1");
  });

  it("keeps protected crew peers when preferReals is over capacity", () => {
    const wave = waveWindowAt(new Date("2026-10-12T12:00:00.000Z"));
    const mates: PoolPlayer[] = Array.from({ length: 7 }, (_, index) => ({
      id: `mate-${index}`,
      name: `Mate ${index}`,
      elo: 1000,
      sport: "running" as const,
      waveStart: wave.waveStart.toISOString(),
      weekEnd: wave.weekEnd.toISOString(),
    }));
    const initial = matcher.assignGroup({
      viewerId: "you",
      viewerName: "You",
      viewerElo: 1000,
      sport: "running",
      now: new Date("2026-10-12T12:00:00.000Z"),
      forcedPeers: mates,
      seed: "full-crew",
      crewId: "crew-full",
    });
    expect(initial.peers).toHaveLength(7);
    expect(initial.synthetics).toHaveLength(0);

    const outsider: PoolPlayer = {
      id: "outsider",
      name: "Outsider",
      elo: 1000,
      sport: "running",
      waveStart: wave.waveStart.toISOString(),
      weekEnd: wave.weekEnd.toISOString(),
    };
    const refreshed = matcher.preferReals(
      initial.enrollment,
      [...mates, outsider],
      "prefer",
      mates.map((mate) => mate.id),
    );
    expect(refreshed.peers).toHaveLength(7);
    expect(refreshed.peers.map((peer) => peer.id)).not.toContain("outsider");
    expect(refreshed.peers.every((peer) => peer.id.startsWith("mate-"))).toBe(
      true,
    );
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

describe("crew shared field", () => {
  it("gives every mate the same synthetics and mutual peers", () => {
    const plan = planCrewWeekField({
      crewId: "crew-42",
      sport: "running",
      members: [
        { id: "a", name: "Ada", elo: 1000 },
        { id: "b", name: "Bea", elo: 1010 },
        { id: "c", name: "Cal", elo: 990 },
      ],
      now: new Date("2026-10-12T12:00:00.000Z"),
    });
    expect(plan.memberIds).toEqual(["a", "b", "c"]);
    expect(plan.syntheticIds).toHaveLength(5);

    const forA = enrollmentFromCrewPlan(plan, "a");
    const forB = enrollmentFromCrewPlan(plan, "b");
    expect(forA.syntheticIds).toEqual(forB.syntheticIds);
    expect(forA.peerIds).toEqual(["b", "c"]);
    expect(forB.peerIds).toEqual(["a", "c"]);
    expect(forA.crewId).toBe("crew-42");
  });

  it("fills no synthetics when the crew already has eight athletes", () => {
    const members = Array.from({ length: 8 }, (_, index) => ({
      id: `u${index}`,
      name: `Runner ${index}`,
      elo: 1000 + index,
    }));
    const plan = planCrewWeekField({
      crewId: "crew-full",
      sport: "cycling",
      members,
      now: new Date("2026-10-12T12:00:00.000Z"),
    });
    expect(plan.memberIds).toHaveLength(8);
    expect(plan.syntheticIds).toHaveLength(0);
    expect(enrollmentFromCrewPlan(plan, "u0").peerIds).toHaveLength(7);
  });
});

describe("planWeekField & fieldPinMatchesEnrollment", () => {
  it("plans a solo open field with real athletes and synthetic fillers up to capacity", () => {
    const field = planWeekField({
      sport: "running",
      waveStart: "2026-10-12T00:00:00.000Z",
      weekEnd: "2026-10-19T00:00:00.000Z",
      capacity: 8,
      members: [
        { id: "user-1", name: "Alice", elo: 1050, distanceM: 5000, movingSec: 1800 },
        { id: "user-2", name: "Bob", elo: 980, distanceM: 3200, movingSec: 1200 },
      ],
    });

    expect(field.crewId).toBe("solo");
    expect(field.crewName).toBe("Open Field");
    expect(field.sport).toBe("running");
    expect(field.memberIds).toEqual(["user-1", "user-2"]);
    expect(field.members).toHaveLength(2);
    expect(field.syntheticIds).toHaveLength(6);
    expect(field.members[0]?.distanceM).toBe(5000);
    expect(field.members[1]?.distanceM).toBe(3200);
  });

  it("matches solo enrollment to open solo field pins and rejects private crew pins", () => {
    const soloEnrollment = {
      sport: "running" as const,
      waveStart: "2026-10-12T00:00:00.000Z",
      weekEnd: "2026-10-19T00:00:00.000Z",
      capacity: 8,
      peerIds: ["user-2"],
      syntheticIds: ["syn-1", "syn-2"],
      autoEnrollNext: true,
      crewId: null,
    };

    const soloPin = {
      crewId: "solo",
      crewName: "Open Field",
      sport: "running" as const,
      waveStart: "2026-10-12T00:00:00.000Z",
      weekEnd: "2026-10-19T00:00:00.000Z",
      capacity: 8,
      memberIds: ["user-1", "user-2"],
      members: [],
      syntheticIds: [],
    };

    const crewPin = {
      crewId: "crew-abc",
      crewName: "Sunrise Runners",
      sport: "running" as const,
      waveStart: "2026-10-12T00:00:00.000Z",
      weekEnd: "2026-10-19T00:00:00.000Z",
      capacity: 8,
      memberIds: ["user-1", "user-2"],
      members: [],
      syntheticIds: [],
    };

    // Solo enrollment matches open solo pin
    expect(fieldPinMatchesEnrollment(soloPin, soloEnrollment)).toBe(true);

    // Solo enrollment rejects private crew pin
    expect(fieldPinMatchesEnrollment(crewPin, soloEnrollment)).toBe(false);

    // Crew enrollment matches its own crew pin
    const crewEnrollment = { ...soloEnrollment, crewId: "crew-abc" };
    expect(fieldPinMatchesEnrollment(crewPin, crewEnrollment)).toBe(true);

    // Crew enrollment rejects different crew pin
    const otherCrewPin = { ...crewPin, crewId: "crew-xyz" };
    expect(fieldPinMatchesEnrollment(otherCrewPin, crewEnrollment)).toBe(false);

    // Pin with different waveStart is rejected
    const pastPin = { ...soloPin, waveStart: "2026-10-05T00:00:00.000Z" };
    expect(fieldPinMatchesEnrollment(pastPin, soloEnrollment)).toBe(false);
  });

  it("does not set crewId on enrollment when plan crewId is 'solo'", () => {
    const soloPlan = {
      crewId: "solo",
      sport: "running" as const,
      waveStart: "2026-10-12T00:00:00.000Z",
      weekEnd: "2026-10-19T00:00:00.000Z",
      capacity: 8,
      memberIds: ["you", "peer-1"],
      members: [
        { id: "you", name: "You", elo: 1000 },
        { id: "peer-1", name: "Peer", elo: 1000 },
      ],
      syntheticIds: ["syn-1"],
    };
    const enrollment = enrollmentFromCrewPlan(soloPlan, "you");
    expect(enrollment.crewId).toBeUndefined();
    expect(enrollment.peerIds).toEqual(["peer-1"]);
  });
});
