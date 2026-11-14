import { describe, expect, it } from "vitest";
import { isCompeteSyncAction, normalizeCompeteSyncAction } from "./sync-intents";

const now = "2026-10-21T12:00:00.000Z";

describe("compete sync intents", () => {
  it("flags tracker sync actions only", () => {
    expect(isCompeteSyncAction({ type: "apply-sync" })).toBe(true);
    expect(isCompeteSyncAction({ type: "duel" })).toBe(false);
    expect(isCompeteSyncAction({ type: "rename" })).toBe(false);
  });

  it("sanitizes apply-sync activities", () => {
    const action = normalizeCompeteSyncAction(
      {
        type: "apply-sync",
        provider: "strava",
        activities: [
          {
            id: "strava-1",
            sport: "running",
            startedAt: "2026-10-21T10:00:00.000Z",
            distanceM: 5000,
            movingSec: 1800,
            avgHr: null,
            verified: true,
            source: "strava",
            provenance: "recorded",
          },
        ],
      },
      "user",
      now,
    );
    expect(action.activities).toHaveLength(1);
  });
});