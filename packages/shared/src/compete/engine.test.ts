import { describe, expect, it } from "vitest";
import { activityFromSample } from "../fitness/samples";
import { adminSnapshot } from "./admin";
import {
  freshState,
  migrateCompeteState,
  reduceCompete,
  rollClock,
  weeklyBoard,
} from "./engine";

describe("compete engine", () => {
  it("allows one-time history import only", () => {
    const now = "2026-10-12T12:00:00.000Z";
    const first = reduceCompete(freshState(new Date(now)), {
      type: "import-history",
      level: "steady",
      now,
    });
    expect(first.calibrated).toBe(true);
    expect(first.activities.some((item) => item.source === "history")).toBe(
      true,
    );

    const second = reduceCompete(first, {
      type: "import-history",
      level: "heavy",
      now,
    });
    expect(second.activities).toEqual(first.activities);
    expect(second.ratings).toEqual(first.ratings);
  });

  it("marks demo links as stub, not connected", () => {
    const next = reduceCompete(freshState(), {
      type: "link",
      provider: "strava",
    });
    const link = next.links.find((item) => item.provider === "strava");
    expect(link?.linked).toBe(true);
    expect(link?.status).toBe("stub");
  });

  it("jumps the clock after a long gap instead of staying stale", () => {
    const ancient = freshState(new Date("2025-01-06T12:00:00.000Z"));
    const rolled = rollClock(ancient, new Date("2026-10-12T12:00:00.000Z"));
    expect(rolled.clock.periodStart).toBe("2026-10-12T00:00:00.000Z");
  });

  it("applies tracker rows once and marks a live link", () => {
    const sample = activityFromSample({
      id: "strava-7",
      provider: "strava",
      externalId: "7",
      categorySlug: "running",
      startedAt: "2026-10-10T12:00:00.000Z",
      metricValue: 8000,
      movingSec: 2400,
      avgHr: 150,
      rawName: "Easy",
    });
    expect(sample?.distanceM).toBe(8000);
    expect(sample?.verified).toBe(true);
    const first = reduceCompete(freshState(new Date("2026-10-12T12:00:00.000Z")), {
      type: "apply-sync",
      provider: "strava",
      activities: sample ? [sample] : [],
      linkStatus: "connected",
      now: "2026-10-12T12:00:00.000Z",
    });
    const again = reduceCompete(first, {
      type: "apply-sync",
      provider: "strava",
      activities: sample ? [sample] : [],
      linkStatus: "connected",
      now: "2026-10-12T12:00:00.000Z",
    });
    expect(again.activities.filter((item) => item.id === "strava-7")).toHaveLength(1);
    expect(again.links.find((item) => item.provider === "strava")?.status).toBe(
      "connected",
    );
  });

  it("drops this week's duel when leaving the board", () => {
    const now = "2026-10-12T12:00:00.000Z";
    const joined = reduceCompete(freshState(new Date(now)), {
      type: "duel",
      sport: "running",
      mode: "auto",
      now,
    });
    expect(joined.duels).toHaveLength(1);
    const left = reduceCompete(joined, { type: "opt-out", sport: "running", now });
    expect(left.ratings.find((item) => item.sport === "running")?.optedIn).toBe(
      false,
    );
    expect(left.duels).toHaveLength(0);
  });

  it("completes onboarding without clearing calibrated", () => {
    const calibrated = reduceCompete(freshState(), {
      type: "import-history",
      level: "light",
      now: "2026-10-12T12:00:00.000Z",
    });
    const done = reduceCompete(calibrated, { type: "complete-onboarding" });
    expect(done.onboardingCompleted).toBe(true);
    expect(done.calibrated).toBe(true);
  });

  it("settles a closed week into period history and pending reveal", () => {
    const now = "2026-10-12T12:00:00.000Z";
    const joined = reduceCompete(freshState(new Date(now)), {
      type: "opt-in",
      sport: "running",
      now,
    });
    expect(joined.enrollments).toHaveLength(1);
    expect(joined.enrollments[0]?.waveStart).toBe("2026-10-12T00:00:00.000Z");
    expect(joined.enrollments[0]?.weekEnd).toBe("2026-10-18T00:00:00.000Z");
    expect(joined.enrollments[0]?.syntheticIds).toHaveLength(7);

    const withWork = reduceCompete(joined, {
      type: "apply-sync",
      provider: "strava",
      linkStatus: "stub",
      now,
      activities: [
        {
          id: "run-1",
          sport: "running",
          startedAt: "2026-10-13T12:00:00.000Z",
          distanceM: 10000,
          movingSec: 3000,
          avgHr: 150,
          verified: true,
          source: "strava",
        },
      ],
    });
    const closed = reduceCompete(withWork, {
      type: "debug-close-week",
      now,
    });
    // Sunday UTC wave reset
    expect(closed.clock.periodStart).toBe("2026-10-18T00:00:00.000Z");
    expect(closed.demoNow).toBe("2026-10-18T00:01:00.000Z");
    expect(closed.periodResults.length).toBeGreaterThan(0);
    expect(closed.pendingRevealIds.length).toBeGreaterThan(0);
    const open = closed.periodResults.find(
      (row) => row.sport === "running" && row.track === "open",
    );
    expect(open?.place).toBeGreaterThanOrEqual(1);
    expect(open?.fieldSize).toBe(8);
    expect(open?.eloBefore).toBe(1000);
    expect(typeof open?.eloAfter).toBe("number");
    expect(closed.enrollments[0]?.waveStart).toBe("2026-10-18T00:00:00.000Z");

    const cleared = reduceCompete(closed, {
      type: "acknowledge-reveal",
      now: "2026-10-18T12:00:00.000Z",
    });
    expect(cleared.pendingRevealIds).toHaveLength(0);
    expect(cleared.periodResults.length).toBe(closed.periodResults.length);
  });

  it("holds elo and still records history when the week is frozen", () => {
    const now = "2026-10-12T12:00:00.000Z";
    const joined = reduceCompete(freshState(new Date(now)), {
      type: "opt-in",
      sport: "running",
      now,
    });
    const frozen = reduceCompete(joined, { type: "freeze", now });
    const closed = reduceCompete(frozen, { type: "debug-close-week", now });
    const open = closed.periodResults.find(
      (row) => row.sport === "running" && row.track === "open",
    );
    expect(open?.frozen).toBe(true);
    expect(open?.eloAfter).toBe(open?.eloBefore);
  });

  it("migrates older compete payloads without period history", () => {
    const legacy = {
      ...freshState(new Date("2026-10-12T12:00:00.000Z")),
    };
    const stripped = {
      ...legacy,
      periodResults: undefined,
      pendingRevealIds: undefined,
      enrollments: undefined,
    };
    const migrated = migrateCompeteState(stripped as never);
    expect(migrated.periodResults).toEqual([]);
    expect(migrated.pendingRevealIds).toEqual([]);
    expect(migrated.enrollments).toEqual([]);
    expect(migrated.localPeers).toBeNull();
    expect(migrated.peerActivities).toEqual([]);
  });
});

describe("week lab", () => {
  const now = "2026-10-13T06:00:00.000Z";

  function joined() {
    return reduceCompete(freshState(new Date(now)), {
      type: "opt-in",
      sport: "running",
      now,
    });
  }

  it("pins the clock without settling an open wave", () => {
    const pinned = reduceCompete(joined(), {
      type: "debug-set-clock",
      now: "2026-10-14T18:00:00.000Z",
    });
    expect(pinned.demoNow).toBe("2026-10-14T18:00:00.000Z");
    expect(pinned.periodResults).toHaveLength(0);
    expect(pinned.enrollments[0]?.waveStart).toBe("2026-10-13T00:00:00.000Z");
    const later = reduceCompete(pinned, { type: "rename", name: "Ada" });
    expect(later.demoNow).toBe("2026-10-14T18:00:00.000Z");
    expect(later.name).toBe("Ada");
  });

  it("counts a manual session inside the wave and ignores one before it", () => {
    const withWork = reduceCompete(joined(), {
      type: "debug-add-session",
      sport: "running",
      startedAt: "2026-10-13T04:00:00.000Z",
      distanceM: 8000,
      movingSec: 2400,
      verified: true,
      now,
    });
    const outside = reduceCompete(withWork, {
      type: "debug-add-session",
      sport: "running",
      startedAt: "2026-10-01T15:00:00.000Z",
      distanceM: 40000,
      movingSec: 9000,
      now,
    });
    const board = weeklyBoard(outside, "running", "open", new Date(now));
    const you = board.find((row) => row.you);
    expect(you?.distanceM).toBe(8000);
    expect(outside.activities.every((item) => item.source === "manual")).toBe(
      true,
    );
    const removed = reduceCompete(outside, {
      type: "debug-remove-session",
      activityId: outside.activities.find((item) => item.distanceM === 8000)?.id,
    });
    const after = weeklyBoard(removed, "running", "open", new Date(now));
    expect(after.find((row) => row.you)?.distanceM).toBe(0);
  });

  it("seats a simulated peer and scores that peer's sessions", () => {
    const peers = [
      {
        id: "ada",
        name: "Ada",
        elo: 1000,
        sport: "running" as const,
        waveStart: "2026-10-13T00:00:00.000Z",
        weekEnd: "2026-10-18T00:00:00.000Z",
      },
    ];
    const seated = reduceCompete(joined(), {
      type: "debug-set-peers",
      peers,
      now,
    });
    expect(seated.localPeers).toEqual(peers);
    expect(seated.enrollments[0]?.peerIds).toEqual(["ada"]);
    expect(seated.enrollments[0]?.syntheticIds).toHaveLength(6);
    const withPeer = reduceCompete(seated, {
      type: "debug-add-session",
      sport: "running",
      peerId: "ada",
      startedAt: "2026-10-13T05:00:00.000Z",
      distanceM: 15000,
      movingSec: 4500,
      now,
    });
    const board = weeklyBoard(withPeer, "running", "open", new Date(now));
    const ada = board.find((row) => row.id === "ada");
    expect(ada?.kind).toBe("real");
    expect(ada?.distanceM).toBe(15000);
    expect(board.find((row) => row.you)?.place).toBeGreaterThan(ada?.place ?? 0);
    const ignored = reduceCompete(withPeer, {
      type: "debug-add-session",
      sport: "running",
      peerId: "missing",
      distanceM: 1000,
      movingSec: 300,
      now,
    });
    expect(ignored.peerActivities).toHaveLength(1);
    const closed = reduceCompete(seated, { type: "debug-close-week" });
    const next = closed.enrollments.find((item) => item.sport === "running");
    expect(next?.waveStart).toBe("2026-10-18T00:00:00.000Z");
    expect(next?.peerIds).toContain("ada");
    expect(closed.localPeers?.[0]?.weekEnd).toBe("2026-10-25T00:00:00.000Z");
  });

  it("restarts a wave without writing period results", () => {
    const advanced = reduceCompete(joined(), {
      type: "debug-advance",
      hours: 26,
      now,
    });
    expect(advanced.demoNow).toBe("2026-10-14T08:00:00.000Z");
    const restarted = reduceCompete(advanced, {
      type: "debug-restart-wave",
      sport: "running",
    });
    expect(restarted.periodResults).toHaveLength(0);
    expect(restarted.enrollments[0]?.waveStart).toBe("2026-10-14T00:00:00.000Z");
  });

  it("settles every opted-in sport when the week closes", () => {
    const both = reduceCompete(joined(), {
      type: "opt-in",
      sport: "cycling",
      now,
    });
    const closed = reduceCompete(both, { type: "debug-close-week" });
    expect(closed.demoNow).toBe("2026-10-18T00:01:00.000Z");
    const sports = new Set(
      closed.periodResults.map((row) => row.sport),
    );
    expect(sports.has("running")).toBe(true);
    expect(sports.has("cycling")).toBe(true);
    expect(closed.periodResults[0]?.settledAt).toBe(closed.demoNow);
    expect(closed.enrollments).toHaveLength(2);
    expect(
      closed.enrollments.every(
        (item) => item.waveStart === "2026-10-18T00:00:00.000Z",
      ),
    ).toBe(true);
    const view = adminSnapshot(closed, new Date("2026-10-13T06:00:00.000Z"));
    expect(view.pinned).toBe(true);
    expect(view.now).toBe("2026-10-18T00:01:00.000Z");
    expect(view.wall).toBe("2026-10-13T06:00:00.000Z");
    expect(view.groups.find((group) => group.sport === "running")?.optedIn).toBe(
      true,
    );
  });
});
