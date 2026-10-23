import { describe, expect, it } from "vitest";
import { freshState } from "./compete/engine";
import { clubDuration, clubWeekSummary } from "./club-summary";
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
        activity("prior", "2026-11-02T04:59:59Z"),
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
  ).toBeUndefined();
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
