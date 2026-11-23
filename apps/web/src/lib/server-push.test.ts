import { describe, expect, it, vi, beforeEach } from "vitest";

const deliverMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/deliver-notification", () => ({
  deliverNotificationToUser: deliverMock,
}));

import {
  notifyBattleRankChanges,
  notifyCompeteOvertakes,
  notifySyncedActivities,
  rankStandings,
} from "./server-push";

describe("server-push", () => {
  beforeEach(() => {
    deliverMock.mockReset();
    deliverMock.mockResolvedValue({ ok: true, mode: "expo" });
  });

  it("notifies only for recent non-journal synced activities", async () => {
    const now = new Date("2026-11-23T12:00:00.000Z");
    const db = {} as never;

    await notifySyncedActivities(
      db,
      "user-1",
      [
        {
          provider: "strava",
          sport: "running",
          startedAt: "2026-10-01T10:00:00.000Z", // older than 48h
        },
        {
          provider: "garmin",
          sport: "cycling",
          startedAt: "2026-11-23T09:00:00.000Z",
        },
      ],
      now,
    );

    expect(deliverMock).toHaveBeenCalledTimes(1);
    expect(deliverMock).toHaveBeenCalledWith(
      db,
      "user-1",
      expect.objectContaining({
        category: "activity_synced",
        title: "Activity synced",
        path: "/today",
      }),
      { requireLive: true },
    );
  });

  it("notifies both the mover and overtaken rivals when battle ranks shift", async () => {
    const db = {
      from: () => ({
        select: () => ({
          in: async () => ({
            data: [
              { id: "alice", display_name: "Alice" },
              { id: "bob", display_name: "Bob" },
            ],
          }),
        }),
      }),
    } as never;

    const before = rankStandings([
      { user_id: "bob", score: 100 },
      { user_id: "alice", score: 50 },
    ]);
    const after = rankStandings([
      { user_id: "bob", score: 100 },
      { user_id: "alice", score: 150 },
    ]);

    await notifyBattleRankChanges(db, "alice", before, after);

    expect(deliverMock).toHaveBeenCalledTimes(2);
    expect(deliverMock).toHaveBeenCalledWith(
      db,
      "alice",
      expect.objectContaining({
        category: "rival_moves",
        title: "You made a pass",
        body: expect.stringContaining("Bob"),
      }),
      { requireLive: true },
    );
    expect(deliverMock).toHaveBeenCalledWith(
      db,
      "bob",
      expect.objectContaining({
        category: "rival_moves",
        title: "Board moved",
        body: expect.stringContaining("Alice"),
      }),
      { requireLive: true },
    );
  });

  it("notifies when a compete overtake moment is committed", async () => {
    const db = {} as never;
    await notifyCompeteOvertakes(db, "alice", [
      {
        id: "m1",
        sport: "running",
        unit: "mi",
        lanes: [
          { id: "alice", name: "Alice" } as never,
          { id: "bob", name: "Bob" } as never,
        ],
        plan: {
          youId: "alice",
          youBefore: 2,
          youAfter: 5,
          rankBefore: 2,
          rankAfter: 1,
          hasOvertake: true,
          anyRivalMoved: false,
          overtakenIds: ["bob"],
          rivalSlideEnd: 0,
        } as never,
      },
    ]);

    expect(deliverMock).toHaveBeenCalledWith(
      db,
      "alice",
      expect.objectContaining({
        category: "rival_moves",
        title: "You made a pass",
        body: "You passed Bob for place 1.",
      }),
      { requireLive: true },
    );
  });
});
