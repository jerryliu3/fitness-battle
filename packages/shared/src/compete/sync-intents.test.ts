import { describe, expect, it } from "vitest";
import { isCompeteSyncAction, normalizeCompeteSyncAction, serializeCompeteSyncActions } from "./sync-intents";
import type { Action } from "./engine";

const now = "2026-10-21T12:00:00.000Z";

describe("compete sync intents", () => {
  it("flags tracker sync actions only", () => {
    expect(isCompeteSyncAction({ type: "apply-sync" })).toBe(true);
    expect(isCompeteSyncAction({ type: "duel" })).toBe(false);
    expect(isCompeteSyncAction({ type: "rename" })).toBe(false);
  });

  it("rejects oversized apply-sync batches", () => {
    expect(() =>
      normalizeCompeteSyncAction(
        {
          type: "apply-sync",
          provider: "strava",
          activities: Array.from({ length: 81 }, (_, index) => ({
            id: `strava-${index}`,
            source: "strava" as const,
          })) as Parameters<typeof normalizeCompeteSyncAction>[0]["activities"],
        },
        "user",
        now,
      ),
    ).toThrow(/sync_batch_too_large/);
  });
});

it("serializes a large history receipt into bounded intents without losing rows", () => {
  const activities = Array.from({ length: 181 }, (_, i) => ({ id: `workout-${i}`, source: "strava", disposition: "counted" })) as NonNullable<Action["activities"]>;
  const actions = serializeCompeteSyncActions({ type: "apply-sync", provider: "strava", activities });
  expect(actions.map(a => a.activities?.length)).toEqual([80, 80, 21]);
  expect(actions.flatMap(a => a.activities ?? []).map(a => a.id)).toEqual(activities.map(a => a.id));
  for (const action of actions) expect(() => normalizeCompeteSyncAction(action, "athlete", "2026-11-17T18:00:00Z")).not.toThrow();
});
