import { describe, expect, it } from "vitest";
import { freshState } from "./engine";
import {
  prepareCompeteStateForAccount,
  sanitizeCompeteStateForAccount,
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

  it("sets unranked guest scores to the account baseline on sanitize", () => {
    const sanitized = sanitizeCompeteStateForAccount(freshState());
    expect(
      sanitized.ratings.every((r) => r.openElo === 1000 && r.verifiedElo === 1000),
    ).toBe(true);
  });

  it("clears retired practice duel rows on account sanitize", () => {
    const state = {
      ...freshState(),
      duels: [
        {
          id: "legacy",
          sport: "running" as const,
          periodStart: "2026-10-12T00:00:00.000Z",
          rivalId: "rival",
          rivalName: "Rival",
          rivalElo: 1000,
          source: "auto" as const,
        },
      ],
    };
    expect(sanitizeCompeteStateForAccount(state).duels).toEqual([]);
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

  it("keeps activities on the wire document for relational persist", () => {
    const activities = [
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
    ];
    const prepared = prepareCompeteStateForAccount({
      ...freshState(),
      activities,
    });
    expect(prepared.activities).toEqual(activities);
  });
});
