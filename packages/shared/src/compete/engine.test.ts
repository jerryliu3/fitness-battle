import { describe, expect, it } from "vitest";
import { activityFromSample } from "../fitness/samples";
import { activityEffort } from "./effort";
import { sameWorkout } from "./ledger";
import { settleElo } from "./elo";
import {
  formatVolume,
  freshState,
  migrateCompeteState,
  placeOrLast,
  reduceCompete,
  rollClock,
  weeklyBoard,
} from "./engine";
import { crewBoardPinFromPlan, planCrewWeekField } from "../matching";

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

  it("ignores practice duel actions and clears leftover matchups", () => {
    const now = "2026-10-12T12:00:00.000Z";
    const base = freshState(new Date(now));
    const withLegacy = {
      ...base,
      duels: [
        {
          id: "legacy",
          sport: "running" as const,
          periodStart: base.clock.periodStart,
          rivalId: "rival",
          rivalName: "Rival",
          rivalElo: 1000,
          source: "auto" as const,
        },
      ],
    };
    const cleared = reduceCompete(withLegacy, {
      type: "duel",
      sport: "running",
      mode: "auto",
      now,
    });
    expect(cleared.duels).toHaveLength(0);
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
    expect(joined.enrollments[0]?.weekEnd).toBe("2026-10-19T00:00:00.000Z");
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
    // Monday UTC week reset
    expect(closed.clock.periodStart).toBe("2026-10-19T00:00:00.000Z");
    expect(closed.demoNow).toBe("2026-10-19T00:01:00.000Z");
    expect(closed.periodResults.length).toBeGreaterThan(0);
    expect(closed.pendingRevealIds.length).toBeGreaterThan(0);
    const open = closed.periodResults.find(
      (row) => row.sport === "running" && row.track === "open",
    );
    expect(open?.place).toBeGreaterThanOrEqual(1);
    expect(open?.fieldSize).toBe(8);
    expect(open?.eloBefore).toBe(1000);
    expect(typeof open?.eloAfter).toBe("number");
    expect(closed.enrollments[0]?.waveStart).toBe("2026-10-19T00:00:00.000Z");

    const cleared = reduceCompete(closed, {
      type: "acknowledge-reveal",
      now: "2026-10-19T12:00:00.000Z",
    });
    expect(cleared.pendingRevealIds).toHaveLength(0);
    expect(cleared.periodResults.length).toBe(closed.periodResults.length);
    expect(
      cleared.periodResults.every((row) => row.acknowledgedAt != null),
    ).toBe(true);
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

    const unfrozen = reduceCompete(frozen, { type: "unfreeze", now });
    expect(unfrozen.freezesLeft).toBe(joined.freezesLeft);
    expect(unfrozen.frozenPeriods).toEqual(joined.frozenPeriods);
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
      units: undefined,
    };
    const migrated = migrateCompeteState(stripped as never);
    expect(migrated.periodResults).toEqual([]);
    expect(migrated.pendingRevealIds).toEqual([]);
    expect(migrated.enrollments).toEqual([]);
    expect(migrated.crewBoard).toBeNull();
    expect(migrated.units).toBe("us");
    expect(migrateCompeteState({ ...legacy, trainingGoal: { distance: "5k", deadline: "2026-02-31" } } as never).trainingGoal).toBeNull();
  });

  it("sets units and formats distance for US and metric", () => {
    const metric = reduceCompete(freshState(), {
      type: "set-units",
      units: "metric",
    });
    expect(metric.units).toBe("metric");
    expect(formatVolume("running", 5000, 1800, "us")).toBe("3.1 mi");
    expect(formatVolume("running", 5000, 1800, "metric")).toBe("5.0 km");
  });

  it("backfills missing sports in ratings and missing providers in links without crashing", () => {
    const partialState = {
      version: 1,
      name: "Old Athlete",
      ratings: [{ sport: "running", verifiedElo: 1050, openElo: 1050, optedIn: true, lockVerified: 1000, lockOpen: 1000, lockPeriod: "2026-10-12T00:00:00.000Z" }],
      links: [{ provider: "strava", linked: true, status: "connected" }],
    };
    const migrated = migrateCompeteState(partialState as never);
    expect(migrated.ratings.length).toBe(4);
    expect(migrated.ratings.find((r) => r.sport === "running")?.verifiedElo).toBe(1050);
    expect(migrated.ratings.find((r) => r.sport === "cycling")?.verifiedElo).toBe(1000);
    expect(migrated.ratings.find((r) => r.sport === "walking")?.verifiedElo).toBe(1000);
    expect(migrated.ratings.find((r) => r.sport === "strength")?.verifiedElo).toBe(1000);

    expect(migrated.links.length).toBe(6);
    expect(migrated.links.find((l) => l.provider === "strava")?.status).toBe("connected");
    expect(migrated.links.find((l) => l.provider === "whoop")?.status).toBe("disconnected");

    expect(migrated.clock).toBeDefined();
    expect(migrated.clock.kind).toBe("weekly");
  });

  it("safely handles missing clock and healthRatings without throwing", () => {
    const headlessState = {
      version: 1,
      name: "Headless",
      clock: undefined,
      healthRatings: [{ metric: "sleep", score: 85 }],
    };
    const migrated = migrateCompeteState(headlessState as never);
    expect(migrated.clock.periodStart).toBeTruthy();
    expect(migrated.healthRatings.length).toBeGreaterThan(0);
  });

  it("keeps pending reveals when account snapshot stores empty pendingRevealIds", () => {
    const base = freshState(new Date("2026-10-12T12:00:00.000Z"));
    const settled = {
      ...base,
      pendingRevealIds: [] as string[],
      periodResults: [
        {
          id: "2026-10-05T00:00:00.000Z:running:open",
          periodStart: "2026-10-05T00:00:00.000Z",
          periodEnd: "2026-10-12T00:00:00.000Z",
          sport: "running" as const,
          track: "open" as const,
          place: 2,
          fieldSize: 8,
          effort: 10,
          distanceM: 8000,
          movingSec: 2400,
          eloBefore: 1000,
          eloAfter: 1010,
          frozen: false,
          settledAt: "2026-10-12T00:00:01.000Z",
          acknowledgedAt: null,
        },
      ],
    };
    const migrated = migrateCompeteState(settled);
    expect(migrated.pendingRevealIds).toEqual([
      "2026-10-05T00:00:00.000Z:running:open",
    ]);
    expect(migrated.periodResults[0]?.acknowledgedAt).toBeNull();
  });

  it("joins together in one opt-in and clears the pin on leave", () => {
    const now = "2026-10-12T12:00:00.000Z";
    const plan = planCrewWeekField({
      crewId: "crew-shared",
      sport: "running",
      members: [
        { id: "user-a", name: "Ada", elo: 1000 },
        { id: "user-b", name: "Bea", elo: 1005, distanceM: 8000, movingSec: 2400 },
      ],
      now: new Date(now),
    });
    const pin = crewBoardPinFromPlan(plan, "Sunday Miles");

    const seated = reduceCompete(freshState(new Date(now)), {
      type: "opt-in",
      sport: "running",
      crewBoard: pin,
      accountId: "user-a",
      now,
    });
    expect(seated.crewBoard?.crewId).toBe("crew-shared");
    expect(seated.enrollments[0]?.crewId).toBe("crew-shared");
    expect(seated.enrollments[0]?.peerIds).toEqual(["user-b"]);
    expect(seated.enrollments[0]?.syntheticIds).toEqual(plan.syntheticIds);

    const board = weeklyBoard(seated, "running", "open", new Date(now));
    expect(board.some((row) => row.id === "user-b")).toBe(true);
    expect(board.find((row) => row.id === "user-b")?.distanceM).toBe(8000);
    expect(board).toHaveLength(8);

    const alone = reduceCompete(seated, {
      type: "opt-in",
      sport: "running",
      crewBoard: null,
      accountId: "user-a",
      now,
    });
    expect(alone.crewBoard).toBeNull();
    expect(alone.enrollments[0]?.crewId ?? null).toBeNull();

    const left = reduceCompete(seated, {
      type: "opt-out",
      sport: "running",
      now,
    });
    expect(left.crewBoard).toBeNull();
    expect(left.enrollments).toHaveLength(0);
  });

  it("drops a stale crew pin when the week rolls", () => {
    const now = "2026-10-12T12:00:00.000Z";
    const plan = planCrewWeekField({
      crewId: "crew-old",
      sport: "running",
      members: [{ id: "user-a", name: "Ada", elo: 1000 }],
      now: new Date(now),
    });
    const pinned = reduceCompete(freshState(new Date(now)), {
      type: "set-crew-board",
      crewBoard: crewBoardPinFromPlan(plan, "Old"),
      accountId: "user-a",
      now,
    });
    const rolled = rollClock(pinned, new Date("2026-10-19T12:00:00.000Z"));
    expect(rolled.crewBoard).toBeNull();
  });

  it("guards missing settlement seats so place stays >= 1 and Elo is not inflated", () => {
    expect(placeOrLast(-1, 8)).toBe(7);
    expect(placeOrLast(-1, 0)).toBe(0);
    expect(placeOrLast(2, 8)).toBe(2);
    // Stored history uses place + 1; -1 would become 0 and fail place >= 1 checks.
    expect(placeOrLast(-1, 8) + 1).toBeGreaterThanOrEqual(1);

    const opponents = [1000, 1000, 1000];
    const inflated = settleElo(1000, opponents, -1, 4, 12, false);
    const lastPlace = settleElo(1000, opponents, placeOrLast(-1, 4), 4, 12, false);
    expect(inflated).toBeGreaterThan(lastPlace);
  });

  it("scales pace bonus based on sport-specific baseline", () => {
    // 5km in 20 min (4 min/km):
    // Running base is 6.5 -> pace bonus should apply
    const runEffort = activityEffort({
      id: "run-fast",
      sport: "running",
      startedAt: "2026-10-12T10:00:00Z",
      distanceM: 5000,
      movingSec: 1200,
      avgHr: null,
      verified: true,
      source: "strava",
    });
    expect(runEffort).toBeGreaterThan(5);

    // Cycling 10km in 20 min (2 min/km = 30 km/h):
    // Cycling base is 3.0 -> gets bonus
    const cycleFast = activityEffort({
      id: "cycle-fast",
      sport: "cycling",
      startedAt: "2026-10-12T10:00:00Z",
      distanceM: 10000,
      movingSec: 1200,
      avgHr: null,
      verified: true,
      source: "strava",
    });
    // Cycling 10km in 60 min (6 min/km = 10 km/h):
    // Slower than 3.0 base pace -> no bonus
    const cycleSlow = activityEffort({
      id: "cycle-slow",
      sport: "cycling",
      startedAt: "2026-10-12T10:00:00Z",
      distanceM: 10000,
      movingSec: 3600,
      avgHr: null,
      verified: true,
      source: "strava",
    });
    expect(cycleFast).toBeGreaterThan(cycleSlow);

    // Walking 3km in 30 min (10 min/km = 6 km/h):
    // Faster than walking base (12.0) -> gets small pace bonus
    const walkFast = activityEffort({
      id: "walk-fast",
      sport: "walking",
      startedAt: "2026-10-12T10:00:00Z",
      distanceM: 3000,
      movingSec: 1800,
      avgHr: null,
      verified: true,
      source: "strava",
    });
    expect(walkFast).toBeGreaterThan(3.0);
  });

  it("differentiates non-GPS workouts by duration rather than 0-distance", () => {
    const act1 = {
      id: "str-1",
      sport: "strength" as const,
      startedAt: "2026-10-12T10:00:00Z",
      distanceM: 0,
      movingSec: 3600, // 60 min
      avgHr: null,
      verified: false,
      source: "apple_health" as const,
    };
    const act2 = {
      id: "str-2",
      sport: "strength" as const,
      startedAt: "2026-10-12T10:01:00Z", // starts 1 min later
      distanceM: 0,
      movingSec: 900, // 15 min (distinct set/workout)
      avgHr: null,
      verified: false,
      source: "apple_health" as const,
    };
    expect(sameWorkout(act1, act2)).toBe(false);

    // But identical time and started within tolerance matches
    const actTwin = { ...act1, id: "str-twin", movingSec: 3650 };
    expect(sameWorkout(act1, actTwin)).toBe(true);
  });

  it("updates and clears profile avatarUrl via set-avatar", () => {
    const state = freshState();
    expect(state.avatarUrl).toBeNull();
    const updated = reduceCompete(state, {
      type: "set-avatar",
      avatarUrl: "https://project.supabase.co/storage/v1/object/public/avatars/user-1/avatar.jpg",
    });
    expect(updated.avatarUrl).toBe(
      "https://project.supabase.co/storage/v1/object/public/avatars/user-1/avatar.jpg",
    );
    const cleared = reduceCompete(updated, {
      type: "set-avatar",
      avatarUrl: null,
    });
    expect(cleared.avatarUrl).toBeNull();
  });
});
