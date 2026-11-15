import { describe, expect, it } from "vitest";
import { isCompeteSyncAction, normalizeCompeteSyncAction } from "./sync-intents";

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