import { describe, expect, it } from "vitest";
import { freshState } from "./compete/engine";
import { clubLifetimeTotals, clubDuration, clubWeekSummary } from "./club-summary";
import type { Activity } from "./compete/sports";
const now = new Date("2026-11-02T16:00:00Z");
const activity = (
  id: string,
  startedAt: string,
  extra: Partial<Activity> = {},
): Activity => ({
  id,
  startedAt,
  sport: "running",
  movingSec: 1800,
  distanceM: 5000,
  avgHr: null,
  source: "manual",
  verified: false,
  provenance: "recorded",
  ...extra,
});
describe("club calendar summary", () => {
  it("uses Eastern half-open weeks across DST and excludes ineligible and future rows", () => {
    const state = {
      ...freshState(now),
      name: "Alex Park",
      activities: [
        activity("prior", "2026-10-26T14:00:00Z"),
        activity("current", "2026-11-02T05:00:00Z"),
        activity("future", "2026-11-03T12:00:00Z"),
        activity("excluded", "2026-11-02T12:00:00Z", {
          disposition: "excluded",
        }),
        activity("sample", "2026-11-02T13:00:00Z", { provenance: "demo" }),
      ],
    };
    expect(clubWeekSummary(state, now)).toMatchObject({
      sessions: 1,
      movingSec: 1800,
      previousSec: 1800,
      activeDays: 1,
      daysPassed: 1,
      firstName: "Alex",
    });
  });
  it("formats clear hours and minutes", () => {
    expect(clubDuration(3720)).toBe("1h 2m");
    expect(clubDuration(0)).toBe("0m");
  });
});

import { nextClubRival } from "./club-summary";
import type { BoardRow } from "./compete/engine";
const row = (id: string, place: number, you = false): BoardRow => ({
  id,
  place,
  you,
  name: id,
  elo: 1000,
  effort: 0,
  distanceM: 0,
  movingSec: 0,
});
it("selects the immediate higher place through ties and handles leading/empty fields", () => {
  expect(
    nextClubRival([row("leader", 1), row("near", 2), row("you", 3, true)]).rival
      ?.id,
  ).toBe("near");
  expect(
    nextClubRival([row("you", 1, true), row("behind", 2)]).rival,
  ).toMatchObject({ id: "behind" });
  expect(nextClubRival([]).you).toBeUndefined();
});

import { clubAchievements } from "./club-summary";
it("derives achievements without counting samples, future or excluded sessions", () => {
  const state = {
    ...freshState(now),
    activities: [
      activity("a", "2026-11-02T12:00:00Z"),
      activity("mock-b", "2026-11-02T12:00:00Z"),
      activity("future", "2026-11-04T12:00:00Z"),
      activity("removed", "2026-11-02T12:00:00Z", { disposition: "excluded" }),
    ],
  };
  const rows = clubAchievements(state, now);
  expect(rows[0]).toMatchObject({ current: 1, earned: true, fraction: 1 });
  expect(rows[1]).toMatchObject({ current: 1, earned: false, fraction: 0.1 });
  expect(rows.find((row) => row.id === "effort-750")?.earned).toBe(false);
});

import { clubSessionMetrics } from "./club-summary";
it("uses athlete units for pace and avoids made-up pace for zero distance or multi-session days", () => {
  const run = activity("a", "2026-11-02T12:00:00Z", {
    movingSec: 1500,
    distanceM: 5000,
  });
  expect(
    clubSessionMetrics([run], "metric").find((m) => m.label === "Pace")?.value,
  ).toBe("5:00/km");
  expect(
    clubSessionMetrics([run], "us").find((m) => m.label === "Pace")?.value,
  ).toBe("8:03/mi");
  expect(
    clubSessionMetrics([{ ...run, distanceM: 0 }], "us").some(
      (m) => m.label === "Pace",
    ),
  ).toBe(false);
  expect(clubSessionMetrics([run, run], "us")).toEqual([]);
});

it("keeps lifetime totals consistent with completed achievement sessions",()=>{
 const state={...freshState(now),activities:[activity("real","2026-11-01T12:00:00Z",{disposition:"counted"}),activity("future","2026-11-03T12:00:00Z",{disposition:"counted"}),activity("excluded","2026-11-01T12:00:00Z",{disposition:"excluded"})]};
 expect(clubLifetimeTotals(state,now).sessions).toBe(1);expect(clubLifetimeTotals(state,now).meters).toBe(5000);
});


import { latestClubRecap } from "./club-summary";
import type { PeriodResult } from "./compete/sports";
it("shows the latest closed recap, preferring the sport default without hiding historical tracks", () => {
 const state = freshState(now);
 const gps: PeriodResult = {id:"gps",sport:state.primary,track:"verified",periodStart:"2026-10-19T04:00:00Z",periodEnd:"2026-10-26T04:00:00Z",settledAt:"2026-10-26T04:00:00Z",place:2,fieldSize:8,effort:1,distanceM:5000,movingSec:1800,eloBefore:1000,eloAfter:1020,frozen:false};
 const future={...gps,id:"future",periodEnd:"2026-11-09T05:00:00Z"};
 expect(latestClubRecap({...state,periodResults:[future,gps]},now)?.id).toBe("gps");
 const open={...gps,id:"open",track:"open" as const};
 expect(latestClubRecap({...state,periodResults:[gps,open]},now)?.id).toBe("gps");
 expect(latestClubRecap({...state,periodResults:[{...open,id:"older",periodEnd:"2026-10-19T04:00:00Z"},gps]},now)?.id).toBe("gps");
});

it("keeps a newer Open-only running recap ahead of an older GPS recap", () => {
  const state = freshState(now);
  const result: PeriodResult = { id: "latest-open", sport: "running", track: "open", periodStart: "2026-10-19T04:00:00Z", periodEnd: "2026-10-26T04:00:00Z", settledAt: "2026-10-26T04:00:00Z", place: 2, fieldSize: 8, effort: 1, distanceM: 5000, movingSec: 1800, eloBefore: 1000, eloAfter: 1020, frozen: false };
  const older = { ...result, id: "older-gps", track: "verified" as const, periodStart: "2026-10-12T04:00:00Z", periodEnd: "2026-10-19T04:00:00Z" };
  const next = { ...state, periodResults: [older, result, { ...result, id: "same-week-gps", track: "verified" as const }] };
  expect(latestClubRecap({ ...state, periodResults: [older, result] }, now)?.id).toBe("latest-open");
  expect(clubLifetimeTotals(next, now).weeks).toBe(2);
  expect(clubLifetimeTotals({ ...next, periodResults: [...next.periodResults, { ...result, id: "future", periodEnd: "2026-11-09T05:00:00Z" }] }, now).weeks).toBe(2);
});

import { clubRivalCardSummary } from "./club-summary";
describe("Home rival card presentation", () => {
  const athlete = (id: string, place: number, distanceM: number, effort = 0) => ({ ...row(id, place, id === "you"), distanceM, effort });
  it("targets the next higher place even when a trailing athlete is closer", () => {
    const rows = [athlete("far-leader", 1, 10000), athlete("Mara Chen", 2, 6000), athlete("you", 3, 5000), athlete("trailing", 4, 4999)];
    expect(clubRivalCardSummary(rows, "running", "metric")).toEqual({ place: "3rd", headline: "1.0 km behind Mara", caption: "Next rival in your field" });
    expect(clubRivalCardSummary([...rows].reverse(), "running", "us").headline).toBe("0.6 mi behind Mara");
  });
  it("gives the leader a closest trailing rival and a positive lead", () => {
    const rows = [athlete("distant", 3, 1000), athlete("you", 1, 6000), athlete("Mara Chen", 2, 5000)];
    expect(clubRivalCardSummary(rows, "running", "metric", ["Mara Chen"])).toEqual({ place: "1st", headline: "1.0 km ahead of Mara", caption: "Closest rival in your field" });
  });
  it("describes equal totals honestly in either ranked order", () => {
    for (const place of [1, 3]) {
      const rows = [athlete("Mara", 2, 5000), athlete("you", place, 5000)];
      expect(clubRivalCardSummary(rows, "running", "metric").headline).toBe("Level with Mara");
    }
  });
  it("shows a tied athlete as level rather than claiming a solo lead", () => {
    const rows = [athlete("Mara", 1, 5000), athlete("you", 1, 5000)];
    expect(clubRivalCardSummary(rows, "running", "metric").headline).toBe("Level with Mara");
  });
  it("uses effort points for strength rather than unrelated distance", () => {
    const rows = [athlete("Mara", 1, 0, 12.5), athlete("you", 2, 9000, 10)];
    expect(clubRivalCardSummary(rows, "strength", "us").headline).toBe("2.5 pts behind Mara");
  });
  it("does not round a positive close gap down to zero", () => {
    const rows = [athlete("Mara", 1, 5010, .01), athlete("you", 2, 5000)];
    expect(clubRivalCardSummary(rows, "running", "metric").headline).toBe("10 m behind Mara");
    expect(clubRivalCardSummary(rows, "running", "us").headline).toBe("33 ft behind Mara");
    expect(clubRivalCardSummary(rows, "strength", "metric").headline).toBe("<0.1 pts behind Mara");
  });
  it("keeps ordinal suffixes and handles solo, missing-self and unregistered fields", () => {
    for (const [place, text] of [[2, "2nd"], [11, "11th"], [12, "12th"], [13, "13th"], [21, "21st"], [22, "22nd"], [23, "23rd"]] as const) {
      expect(clubRivalCardSummary([athlete("you", place, 0)], "running", "us").place).toBe(text);
    }
    expect(clubRivalCardSummary([athlete("you", 1, 0)], "running", "us").headline).toBe("You’re leading the way.");
    for (const rows of [[], [athlete("Mara", 1, 1000)]]) {
      expect(clubRivalCardSummary(rows, undefined, "us")).toEqual({ place: null, headline: "Your next chapter starts here.", caption: "Register for a weekly event." });
    }
  });
});

import { seasonPassModel, athleteMomentumModel } from "./club-summary";
describe("seasonPassModel & athleteMomentumModel", () => {
  it("builds season ladder checkpoints and recent settled week nodes without future rounds", () => {
    const base = freshState(now);
    const settled1: PeriodResult = {
      id: "w1",
      sport: "running",
      track: "verified",
      periodStart: "2026-10-19T04:00:00Z",
      periodEnd: "2026-10-26T04:00:00Z",
      settledAt: "2026-10-26T04:00:00Z",
      place: 1,
      fieldSize: 8,
      effort: 42.5,
      distanceM: 25000,
      movingSec: 7200,
      eloBefore: 1140,
      eloAfter: 1168,
      frozen: false,
    };
    const future: PeriodResult = {
      ...settled1,
      id: "future",
      periodStart: "2026-11-02T04:00:00Z",
      periodEnd: "2026-11-09T05:00:00Z",
    };
    const state = {
      ...base,
      primary: "running" as const,
      ratings: base.ratings.map((r) =>
        r.sport === "running"
          ? { ...r, openElo: 1168, verifiedElo: 1168 }
          : r,
      ),
      periodResults: [future, settled1],
    };
    const pass = seasonPassModel(state, "verified", now);
    expect(pass.score).toBe(1168);
    expect(pass.band.name).toBe("Active");
    expect(pass.nextBand?.name).toBe("Steady");
    expect(pass.intoNext).toBe(32);
    expect(pass.weekNodes).toHaveLength(1);
    expect(pass.weekNodes[0]).toMatchObject({
      id: "w1",
      place: 1,
      fieldSize: 8,
      delta: 28,
      headline: "Took the field",
    });
    expect(pass.winsCount).toBe(1);
    expect(pass.podiumsCount).toBe(1);
  });

  it("derives 4 live momentum rings and 2 breakthrough bento cards from real state", () => {
    const base = freshState(now);
    const settled: PeriodResult = {
      id: "w1",
      sport: "running",
      track: "verified",
      periodStart: "2026-10-19T04:00:00Z",
      periodEnd: "2026-10-26T04:00:00Z",
      settledAt: "2026-10-26T04:00:00Z",
      place: 1,
      fieldSize: 8,
      effort: 42.5,
      distanceM: 25000,
      movingSec: 7200,
      eloBefore: 1140,
      eloAfter: 1168,
      frozen: false,
    };
    const state = {
      ...base,
      lifetimeOvertakes: 19,
      ratings: base.ratings.map((r) =>
        r.sport === "running" ? { ...r, openElo: 1168 } : r,
      ),
      activities: [
        activity("pb1", "2026-10-11T12:00:00Z", {
          distanceM: 5000,
          movingSec: 1440,
          verified: true,
        }),
        activity("pb2", "2026-10-25T12:00:00Z", {
          distanceM: 5000,
          movingSec: 1422,
          verified: true,
        }),
      ],
      periodResults: [settled],
    };
    const momentum = athleteMomentumModel(state, now);
    expect(momentum.rings.map((r) => r.id)).toEqual([
      "streak",
      "sessions",
      "rating",
      "passes",
    ]);
    expect(momentum.rings.find((r) => r.id === "sessions")).toMatchObject({
      current: 2,
      target: 10,
      percent: 20,
    });
    expect(momentum.rings.find((r) => r.id === "passes")).toMatchObject({
      current: 19,
      target: 25,
      percent: 76,
    });
    expect(momentum.bentoCards[0]).toMatchObject({
      id: "bento-pb",
      badge: "FASTEST 5K",
      value: "23:42",
      earned: true,
    });
    expect(momentum.bentoCards[0]?.delta).toContain("18s faster");
    expect(momentum.bentoCards[1]).toMatchObject({
      id: "bento-finish",
      badge: "FIELD WINNER",
      value: "#1 of 8",
      earned: true,
    });
  });
});
