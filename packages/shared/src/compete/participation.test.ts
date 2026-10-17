import { describe, expect, it } from "vitest";
import { freshState, reduceCompete } from "./engine";
import { openEnrollmentRemoved } from "./participation";
import { fieldChangeNotice, type SeenField } from "./field-notice";
import { sumCrewWindow } from "./crew-volume";
import { applyRemoteSnapshot } from "./snapshot";

describe("participation hold", () => {
  it("allows a scheduled stop and rejects dropping the open week", () => {
    const now = "2026-10-14T12:00:00.000Z";
    const joined = reduceCompete(freshState(new Date(now)), {
      type: "opt-in",
      sport: "running",
      now,
    });
    const stopping = reduceCompete(joined, {
      type: "schedule-leave",
      sport: "running",
      now,
    });
    const left = reduceCompete(joined, { type: "opt-out", sport: "running", now });
    expect(openEnrollmentRemoved(joined, stopping, new Date(now))).toBe(false);
    expect(openEnrollmentRemoved(joined, left, new Date(now))).toBe(true);
    const shortened = {
      ...joined,
      enrollments: joined.enrollments.map((item) => ({
        ...item,
        weekEnd: "2026-10-13T00:00:00.000Z",
      })),
    };
    expect(openEnrollmentRemoved(joined, shortened, new Date(now))).toBe(true);
  });

  it("rejects leaving sleep before the week closes", () => {
    const now = "2026-10-14T12:00:00.000Z";
    const joined = reduceCompete(freshState(new Date(now)), {
      type: "opt-in-health",
      metric: "sleep",
      now,
    });
    const stopping = reduceCompete(joined, {
      type: "schedule-leave",
      metric: "sleep",
      now,
    });
    const left = reduceCompete(joined, { type: "opt-out-health", metric: "sleep", now });
    expect(stopping.healthRatings.find((item) => item.metric === "sleep")?.optedIn).toBe(
      true,
    );
    expect(stopping.healthRatings.find((item) => item.metric === "sleep")?.autoEnrollNext).toBe(
      false,
    );
    expect(openEnrollmentRemoved(joined, stopping, new Date(now))).toBe(false);
    expect(openEnrollmentRemoved(joined, left, new Date(now))).toBe(true);
    const moved = {
      ...joined,
      healthRatings: joined.healthRatings.map((item) =>
        item.metric === "sleep" ? { ...item, lockPeriod: "2026-10-05T00:00:00.000Z" } : item,
      ),
    };
    expect(openEnrollmentRemoved(joined, moved, new Date(now))).toBe(true);
  });
});

describe("field change notice", () => {
  const base: SeenField = {
    version: 1,
    accountKey: "acct",
    sport: "running",
    periodStart: "2026-10-12T00:00:00.000Z",
    youDistanceM: 7800,
    youMovingSec: 2400,
    youPlace: 4,
    units: "metric",
    rivals: [{ id: "maya", name: "Maya", distanceM: 10000, movingSec: 3000 }],
  };

  it("stays quiet on the first visit, a new period, and an unchanged poll", () => {
    const next = { ...base, youDistanceM: 12900, youPlace: 2 };
    expect(fieldChangeNotice(null, next)).toBeNull();
    expect(
      fieldChangeNotice({ ...base, periodStart: "2026-10-05T00:00:00.000Z" }, next),
    ).toBeNull();
    expect(fieldChangeNotice(base, { ...base })).toBeNull();
  });

  it("combines your gain and a real competitor into one line", () => {
    const notice = fieldChangeNotice(base, {
      ...base,
      youDistanceM: 12900,
      youPlace: 2,
      rivals: [{ id: "maya", name: "Maya", distanceM: 14200, movingSec: 3600 }],
    });
    expect(notice).toEqual({
      title: "+5.1 km counted · Maya added 4.2 km · #4 → #2",
      personal: true,
      rival: true,
    });
  });
});

describe("crew window totals", () => {
  it("sums counted distance inside the week and ignores the rest", () => {
    const totals = sumCrewWindow(
      [
        {
          userId: "a",
          distanceM: 1000,
          movingSec: 300,
          startedAt: "2026-10-13T12:00:00.000Z",
        },
        {
          userId: "a",
          distanceM: 500,
          movingSec: 100,
          startedAt: "2026-10-20T12:00:00.000Z",
        },
      ],
      "2026-10-12T00:00:00.000Z",
      "2026-10-19T00:00:00.000Z",
    );
    expect(totals.get("a")).toEqual({ distanceM: 1000, movingSec: 300 });
  });
});

describe("applyRemoteSnapshot", () => {
  it("keeps unsaved edits while taking new server activity and the crew board", () => {
    const local = freshState(new Date("2026-10-14T12:00:00.000Z"));
    local.name = "Device";
    local.demoNow = "2026-10-14T12:00:00.000Z";
    const remote = freshState(new Date("2026-10-14T12:00:00.000Z"));
    remote.name = "Server";
    remote.activities = [
      {
        id: "server-run",
        sport: "running",
        startedAt: "2026-10-14T12:00:00.000Z",
        distanceM: 5000,
        movingSec: 1800,
        avgHr: null,
        verified: true,
        source: "strava",
        provenance: "recorded",
        disposition: "counted",
      },
    ];
    remote.crewBoard = {
      crewId: "crew-1",
      crewName: "Sunday",
      sport: "running",
      waveStart: remote.clock.periodStart,
      weekEnd: "2026-10-19T00:00:00.000Z",
      capacity: 8,
      memberIds: ["acct"],
      members: [
        { id: "acct", name: "Device", elo: 1000, distanceM: 5000, movingSec: 1800 },
      ],
      syntheticIds: [],
    };
    const dirty = applyRemoteSnapshot(local, remote, true);
    expect(dirty.name).toBe("Device");
    expect(dirty.activities.some((item) => item.id === "server-run")).toBe(true);
    expect(dirty.crewBoard?.crewId).toBe("crew-1");
    expect(applyRemoteSnapshot(local, remote, false).name).toBe("Server");
  });
});
