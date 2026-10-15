import { describe, expect, it } from "vitest";
import { freshState } from "./engine";
import {
  isFatCompeteSnapshot,
  prepareCompeteStateForAccount,
  sanitizeCompeteStateForAccount,
  thinCompeteStateForAccount,
  withDerivedPendingReveals,
} from "./sanitize";

describe("sanitizeCompeteStateForAccount", () => {
  it("strips demoNow from account-durable state", () => {
    const state = {
      ...freshState(),
      demoNow: "2026-10-19T00:01:00.000Z",
    };
    expect(sanitizeCompeteStateForAccount(state).demoNow).toBeNull();
    expect(sanitizeCompeteStateForAccount(freshState()).demoNow).toBeNull();
  });

  it("strips durable crewBoard and pendingRevealIds for account writes", () => {
    const state = {
      ...freshState(),
      demoNow: "2026-10-19T00:01:00.000Z",
      pendingRevealIds: ["x"],
      crewBoard: {
        crewId: "c1",
        crewName: "Crew",
        sport: "running" as const,
        waveStart: "2026-10-12T00:00:00.000Z",
        weekEnd: "2026-10-19T00:00:00.000Z",
        capacity: 8,
        memberIds: ["u1"],
        members: [{ id: "u1", name: "You", elo: 1000 }],
        syntheticIds: [] as string[],
      },
    };
    const prepared = prepareCompeteStateForAccount(state);
    expect(prepared.demoNow).toBeNull();
    expect(prepared.crewBoard).toBeNull();
    expect(prepared.pendingRevealIds).toEqual([]);
  });

  it("derives pendingRevealIds from acknowledgedAt", () => {
    const state = {
      ...freshState(),
      periodResults: [
        {
          id: "a",
          periodStart: "2026-10-05T00:00:00.000Z",
          periodEnd: "2026-10-12T00:00:00.000Z",
          sport: "running" as const,
          track: "open" as const,
          place: 1,
          fieldSize: 8,
          effort: 1,
          distanceM: 1000,
          movingSec: 300,
          eloBefore: 1000,
          eloAfter: 1010,
          frozen: false,
          settledAt: "2026-10-12T00:00:01.000Z",
          acknowledgedAt: null,
        },
      ],
      pendingRevealIds: [] as string[],
    };
    expect(withDerivedPendingReveals(state).pendingRevealIds).toEqual(["a"]);
  });

  it("thins dual-written bulk collections from the stored snapshot", () => {
    const state = {
      ...freshState(),
      activities: [
        {
          id: "a1",
          sport: "running" as const,
          startedAt: "2026-10-12T12:00:00.000Z",
          distanceM: 5000,
          movingSec: 1500,
          avgHr: null,
          verified: true,
          source: "strava" as const,
        },
      ],
      periodResults: [
        {
          id: "r1",
          periodStart: "2026-10-05T00:00:00.000Z",
          periodEnd: "2026-10-12T00:00:00.000Z",
          sport: "running" as const,
          track: "open" as const,
          place: 1,
          fieldSize: 8,
          effort: 1,
          distanceM: 1000,
          movingSec: 300,
          eloBefore: 1000,
          eloAfter: 1010,
          frozen: false,
          settledAt: "2026-10-12T00:00:01.000Z",
          acknowledgedAt: null,
        },
      ],
      enrollments: [
        {
          sport: "running" as const,
          waveStart: "2026-10-12T00:00:00.000Z",
          weekEnd: "2026-10-19T00:00:00.000Z",
          capacity: 8,
          peerIds: [] as string[],
          syntheticIds: ["s1"],
          autoEnrollNext: true,
        },
      ],
      frozenPeriods: ["2026-10-05T00:00:00.000Z"],
      sleepNights: freshState().sleepNights,
    };
    expect(isFatCompeteSnapshot(state)).toBe(true);
    const thin = thinCompeteStateForAccount(state);
    expect(thin.activities).toEqual([]);
    expect(thin.periodResults).toEqual([]);
    expect(thin.enrollments).toEqual([]);
    expect(thin.frozenPeriods).toEqual([]);
    expect(thin.ratings.length).toBe(state.ratings.length);
    expect(isFatCompeteSnapshot(thin)).toBe(false);
  });
});
