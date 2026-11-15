import { expect, it } from "vitest";
import { freshState, reduceCompete, rollClock, withAccountEloBaseline } from "@fitness-battle/shared";
import { applyCompeteIntents } from "./apply-compete-intents";

const now = new Date("2026-10-28T15:00:00Z");

it("scores exclusions only after dispositions are on the account", () => {
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
  const viaReduce = rollClock(
    reduceCompete(stored, {
      type: "set-disposition",
      activityId: "strava-counted",
      disposition: "excluded",
      accountId: "athlete",
      now: now.toISOString(),
    }),
    now,
  );
  const viaServerApply = rollClock(
    applyCompeteIntents(
      stored,
      [{ type: "set-disposition", activityId: "strava-counted", disposition: "excluded" }],
      "athlete",
      now,
    ),
    now,
  );
  expect(viaReduce.effortMilestones?.some((row) => row.earned > 0)).toBe(true);
  expect(viaServerApply.effortMilestones?.every((row) => row.earned === 0)).toBe(true);
});