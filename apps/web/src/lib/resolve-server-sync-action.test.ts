import { expect, it } from "vitest";
import { freshState, withAccountEloBaseline, type Action } from "@fitness-battle/shared";
import { resolveServerSyncAction } from "./resolve-server-sync-action";

const now = new Date("2026-10-28T15:00:00Z");

it("keeps stored tracker facts and only applies disposition from the client", () => {
  const stored = withAccountEloBaseline(freshState(now));
  stored.activities = [
    {
      id: "strava-1",
      sport: "running",
      startedAt: now.toISOString(),
      distanceM: 5000,
      movingSec: 1800,
      avgHr: 150,
      verified: true,
      provenance: "recorded",
      disposition: "counted",
      source: "strava",
    },
  ];
  const action = resolveServerSyncAction(
    stored,
    {
      type: "apply-sync",
      provider: "strava",
      activities: [
        {
          id: "strava-1",
          sport: "running",
          startedAt: now.toISOString(),
          distanceM: 500_000,
          movingSec: 1,
          avgHr: null,
          verified: false,
          provenance: "demo",
          disposition: "excluded",
          source: "strava",
        },
      ],
    },
    "athlete",
    now,
  );
  expect(action.activities?.[0]).toMatchObject({
    id: "strava-1",
    distanceM: 5000,
    verified: true,
    disposition: "excluded",
  });
});

it("rejects forged tracker rows that are not already on the account", () => {
  const stored = withAccountEloBaseline(freshState(now));
  expect(() =>
    resolveServerSyncAction(
      stored,
      {
        type: "apply-sync",
        provider: "strava",
        activities: [
          { id: "forged", disposition: "counted", source: "strava" },
        ] as NonNullable<Action["activities"]>,
      },
      "athlete",
      now,
    ),
  ).toThrow(/invalid_sync/);
});

it("requires the confirmed tracker import instead of generating calibration history", () => {
  expect(() => resolveServerSyncAction(freshState(now), { type: "import-history" }, "athlete", now)).toThrow("history_confirmation_required");
});
