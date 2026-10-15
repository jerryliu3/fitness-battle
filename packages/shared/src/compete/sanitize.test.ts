import { describe, expect, it } from "vitest";
import { freshState } from "./engine";
import {
  sanitizeCompeteStateForAccount,
  shrinkCompeteSnapshot,
  stripDurableCrewBoard,
} from "./sanitize";

describe("sanitizeCompeteStateForAccount", () => {
  it("strips demoNow from account-durable state", () => {
    const state = {
      ...freshState(),
      demoNow: "2026-10-19T00:01:00.000Z",
    };
    expect(sanitizeCompeteStateForAccount(state).demoNow).toBeNull();
  });

  it("shrinks collections and drops crewBoard", () => {
    const state = {
      ...freshState(),
      demoNow: "2026-10-19T00:01:00.000Z",
      activities: [
        {
          id: "strava-1",
          sport: "running" as const,
          startedAt: "2026-10-13T12:00:00.000Z",
          distanceM: 5000,
          movingSec: 1500,
          avgHr: null,
          verified: true,
          source: "strava" as const,
        },
      ],
      crewBoard: {
        crewId: "c1",
        crewName: "Crew",
        sport: "running" as const,
        waveStart: "2026-10-12T00:00:00.000Z",
        weekEnd: "2026-10-19T00:00:00.000Z",
        capacity: 8,
        memberIds: ["u1"],
        members: [{ id: "u1", name: "You", elo: 1000 }],
        syntheticIds: [],
      },
    };
    expect(stripDurableCrewBoard(state).crewBoard).toBeNull();
    const thin = shrinkCompeteSnapshot(state);
    expect(thin.demoNow).toBeNull();
    expect(thin.activities).toEqual([]);
    expect(thin.crewBoard).toBeNull();
    expect(thin.name).toBe(state.name);
  });
});
