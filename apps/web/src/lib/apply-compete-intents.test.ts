import { expect, it } from "vitest";
import {
  applyCompeteEdit,
  freshState,
  reduceCompete,
  rollClock,
  settleCompetition,
  withAccountEloBaseline,
} from "@fitness-battle/shared";
import { applyAccountSaveInOrder, applyOrderedAccountActions } from "./apply-compete-intents";

const now = new Date("2026-10-28T15:00:00Z");
const userId = "athlete";

it("keeps focus changes after enrollment when they follow an opt-in", async () => {
  const start = new Date("2026-10-20T12:00:00Z");
  const stored = reduceCompete(withAccountEloBaseline(freshState(start)), {
    type: "opt-in",
    sport: "running",
    now: start.toISOString(),
  });
  const actions = [
    { type: "opt-in", sport: "running" as const },
    { type: "set-focus", focus: { family: "health", id: "sleep" } as const },
  ];
  const applied = await applyAccountSaveInOrder(stored, actions, userId, now, async (state, scoreOpen) =>
    scoreOpen ? settleCompetition(state, now) : state,
  );
  expect(applied.focus).toEqual({ family: "health", id: "sleep" });
});

it("scores the open period only after all ordered edits", async () => {
  const stored = reduceCompete(withAccountEloBaseline(freshState(now)), {
    type: "opt-in",
    sport: "running",
    now: now.toISOString(),
  });
  const scores: boolean[] = [];
  await applyAccountSaveInOrder(
    stored,
    [
      { type: "schedule-leave", sport: "running" as const },
      { type: "set-disposition", activityId: "any", disposition: "excluded" as const },
    ],
    userId,
    now,
    async (state, scoreOpen) => {
      scores.push(scoreOpen);
      return state;
    },
  );
  expect(scores).toEqual([false, true]);
});

it("rejoins after a stopped wave closes", async () => {
  const start = new Date("2026-10-20T12:00:00Z");
  let stored = reduceCompete(withAccountEloBaseline(freshState(start)), {
    type: "opt-in",
    sport: "running",
    now: start.toISOString(),
  });
  stored = reduceCompete(stored, {
    type: "schedule-leave",
    sport: "running",
    now: start.toISOString(),
  });
  stored = {
    ...stored,
    enrollments: stored.enrollments.map((enrollment) =>
      enrollment.sport === "running"
        ? { ...enrollment, weekEnd: "2026-10-27T04:00:00.000Z", autoEnrollNext: false }
        : enrollment,
    ),
  };
  const actions = [{ type: "opt-in", sport: "running" as const }];
  const applied = await applyAccountSaveInOrder(stored, actions, userId, now, async (state, scoreOpen) => {
    if (!scoreOpen) {
      return {
        ...state,
        enrollments: state.enrollments.filter(
          (enrollment) =>
            !(
              enrollment.sport === "running" &&
              Date.parse(enrollment.weekEnd) <= now.getTime()
            ),
        ),
        ratings: state.ratings.map((row) =>
          row.sport === "running" ? { ...row, optedIn: false } : row,
        ),
      };
    }
    return settleCompetition(state, now);
  });
  expect(applied.ratings.find((row) => row.sport === "running")?.optedIn).toBe(true);
  expect(applied.enrollments.some((enrollment) => enrollment.sport === "running")).toBe(true);
});

it("does not advance competition time while applying account edits", () => {
  const stored = withAccountEloBaseline(freshState(now));
  const applied = applyOrderedAccountActions(
    stored,
    [{ type: "rename", name: "Ada" }],
    userId,
    now,
  );
  expect(applied.periodStart).toBe(stored.periodStart);
  expect(applied.sleepNights).toEqual(stored.sleepNights);
});

it("applies log-manual before set-disposition when actions arrive in that order", () => {
  const stored = reduceCompete(withAccountEloBaseline(freshState(now)), {
    type: "opt-in",
    sport: "running",
    now: now.toISOString(),
  });
  const activityId = "manual-run-1";
  const applied = applyOrderedAccountActions(
    stored,
    [
      {
        type: "log-manual",
        sport: "running",
        activityId,
        movingSec: 2400,
        distanceM: 10_000,
        startedAt: "2026-10-28T12:00:00Z",
      },
      {
        type: "set-disposition",
        activityId,
        disposition: "excluded",
      },
    ],
    userId,
    now,
  );
  const row = applied.activities.find((activity) => activity.id === activityId);
  expect(row?.disposition).toBe("excluded");
});

it("matches client disposition edits after canonical settlement", () => {
  const enrolled = reduceCompete(
    withAccountEloBaseline(freshState(now)),
    { type: "opt-in", sport: "running", now: "2026-10-28T09:00:00Z" },
  );
  const stored = {
    ...enrolled,
    activities: [
      {
        id: "strava-counted",
        sport: "running" as const,
        startedAt: "2026-10-28T12:00:00Z",
        distanceM: 20_000,
        movingSec: 3600,
        avgHr: null,
        source: "strava" as const,
        verified: true,
        provenance: "recorded" as const,
        disposition: "counted" as const,
      },
    ],
  };
  const viaClient = rollClock(
    reduceCompete(stored, {
      type: "set-disposition",
      activityId: "strava-counted",
      disposition: "excluded",
      accountId: userId,
      now: now.toISOString(),
    }),
    now,
  );
  const viaServer = rollClock(
    applyOrderedAccountActions(
      stored,
      [{ type: "set-disposition", activityId: "strava-counted", disposition: "excluded" }],
      userId,
      now,
    ),
    now,
  );
  expect(viaServer.effortMilestones?.map((row) => row.earned)).toEqual(
    viaClient.effortMilestones?.map((row) => row.earned),
  );
  expect(
    viaServer.activities.find((row) => row.id === "strava-counted")?.disposition,
  ).toBe("excluded");
  expect(
    applyCompeteEdit(stored, { type: "rename", name: "Ada", now: now.toISOString() }).periodStart,
  ).toBe(stored.periodStart);
});