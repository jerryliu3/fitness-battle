import { expect, it } from "vitest";
import { freshState, reduceCompete, type Action } from "./compete/engine";
import { planSyncReview } from "./sync-review";
import type { Activity } from "./compete/sports";
const now = new Date("2026-10-22T18:00:00Z");
const activity = (
  id: string,
  startedAt: string,
  extra: Partial<Activity> = {},
): Activity => ({
  id,
  sport: "running",
  startedAt,
  distanceM: 6000,
  movingSec: 1800,
  avgHr: null,
  source: "strava",
  verified: true,
  provenance: "recorded",
  disposition: "counted",
  ...extra,
});
const today = activity("today", "2026-10-22T12:00:00Z"),
  old = activity("old", "2026-10-20T12:00:00Z");
it("reviews all newly synced eligible activities, including older imports", () => {
  const state = freshState(now),
    action: Action = {
      type: "apply-sync",
      provider: "strava",
      activities: [old, today],
      now: now.toISOString(),
    };
  const plan = planSyncReview(action, state);
  expect(plan.immediate.syncPresentation).toBeUndefined();
  expect(plan.immediate.activities?.map((a) => a.id)).toEqual([]);
  expect(plan.deferred?.activities?.map((a) => a.id)).toEqual(["old", "today"]);
  const split = reduceCompete(
    reduceCompete(state, plan.immediate),
    plan.deferred!,
  );
  expect(split.activities).toEqual(reduceCompete(state, action).activities);
  expect(split.ratings).toEqual(reduceCompete(state, action).ratings);
});
it("does not create a recap backlog or repeat unchanged activities", () => {
  const state = { ...freshState(now), activities: [today] };
  const result = planSyncReview(
    {
      type: "apply-sync",
      provider: "strava",
      activities: [today],
      now: now.toISOString(),
    },
    state,
  );
  expect(result.activities).toEqual([]);
  expect(result.deferred).toBeNull();
});
it("keeps sample previews distinct and excludes future, other-provider and user-excluded sessions", () => {
  const state = {
    ...freshState(now),
    activities: [{ ...today, disposition: "excluded" as const }],
  };
  const result = planSyncReview(
    {
      type: "apply-sync",
      provider: "strava",
      activities: [
        today,
        activity("future", "2026-10-23T12:00:00Z"),
        activity("other", today.startedAt, { source: "garmin" }),
      ],
      now: now.toISOString(),
    },
    state,
  );
  expect(result.activities).toEqual([]);
  const preview = planSyncReview(
    {
      type: "apply-sync",
      provider: "strava",
      activities: [{ ...today, id: "sample", provenance: "demo" }],
      linkStatus: "stub",
      now: now.toISOString(),
    },
    state,
  );
  expect(preview.preview).toBe(true);
  expect(preview.deferred).toBeNull();
  expect(preview.activities).toHaveLength(1);
});
it("accepts newly synced past activity across Eastern midnight and rejects future instants", () => {
  const at = new Date("2026-10-23T02:00:00Z"),
    state = freshState(at);
  const result = planSyncReview(
    {
      type: "apply-sync",
      provider: "strava",
      activities: [
        activity("same-day", "2026-10-23T01:00:00Z"),
        activity("yesterday", "2026-10-22T02:00:00Z"),
      ],
      now: at.toISOString(),
    },
    state,
  );
  expect(result.activities.map((a) => a.id)).toEqual(["same-day", "yesterday"]);
});

it("normalizes sample generation to one instant for a clearly marked preview", () => {
  const state = reduceCompete(freshState(now), {
    type: "link",
    provider: "garmin",
    now: now.toISOString(),
  });
  const plan = planSyncReview(
    { type: "sync", provider: "garmin", allowSample: true },
    state,
  );
  expect(plan.preview).toBe(true);
  expect(plan.activities).toHaveLength(1);
  expect(plan.activities[0]!.startedAt).toBe(plan.immediate.now);
  expect(plan.deferred).toBeNull();
});
