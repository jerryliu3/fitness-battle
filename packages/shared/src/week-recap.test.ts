import { describe, expect, it } from "vitest";
import { freshState } from "./compete/engine";
import type { Activity, PeriodResult } from "./compete/sports";
import type { CompetitionReplay } from "./competition-replay";
import {
  nonRaceWeekBreakdownTarget, weekRecapBreakdown, weekRecapHeartRateRanges, weekRecapHighlights,
  weekRecapNextRound, weekRecapPages, weekRecapPodium, weekRecapTraining,
} from "./week-recap";

const result: PeriodResult = {
  id: "running-open", sport: "running", track: "open",
  periodStart: "2026-10-26T04:00:00Z", periodEnd: "2026-11-02T05:00:00Z",
  place: 2, fieldSize: 8, effort: 10, distanceM: 5000, movingSec: 1800,
  eloBefore: 1100, eloAfter: 1105, frozen: false, settledAt: "2026-11-02T05:00:00Z",
};
const activity = (startedAt: string, movingSecOrOverrides: number | Partial<Activity> = 600): Activity => ({
  id: startedAt, sport: "running", startedAt, movingSec: typeof movingSecOrOverrides === "number" ? movingSecOrOverrides : 600, distanceM: 1000,
  avgHr: null, verified: false, source: "manual", disposition: "counted",
  ...(typeof movingSecOrOverrides === "number" ? {} : movingSecOrOverrides),
});
const stateWith = (activities: Activity[]) => ({ ...freshState(new Date("2026-11-02T12:00:00Z")), activities });

describe("week recap pages", () => {
  it("pairs result and training pages per sport in product sport order", () => {
    const cycling = { ...result, id: "cycling", sport: "cycling" as const };
    const input = [cycling, result];
    expect(weekRecapPages(input).map(p => p.kind === "arrival" ? p.kind : `${p.kind === "results" ? p.result.sport : p.sport}:${p.kind}`))
      .toEqual(["arrival", "running:results", "running:effort", "cycling:results", "cycling:effort"]);
    expect(input).toEqual([cycling, result]);
  });
  it("handles one sport and empty input without phantom sport pages", () => {
    expect(weekRecapPages([result]).length).toBe(3);
    expect(weekRecapPages([])).toEqual([{ kind: "arrival" }]);
  });
});

describe("week recap training", () => {
  it("keeps the repeated fall-back hour and late Sunday in one Eastern date bucket", () => {
    const series = weekRecapTraining(stateWith([
      activity("2026-11-01T01:30:00-04:00"),
      activity("2026-11-01T01:30:00-05:00", 1200),
      activity("2026-11-01T23:30:00-05:00", 1800),
    ]), result);
    expect(series.labels).toEqual(["Oct 26", "Oct 27", "Oct 28", "Oct 29", "Oct 30", "Oct 31", "Nov 1"]);
    expect(series.values).toEqual([0, 0, 0, 0, 0, 0, 60]);
  });
  it("uses half-open instants across offset encodings and excludes uncounted/other-sport rows", () => {
    const included = activity("2026-10-26T00:00:00-04:00");
    const series = weekRecapTraining(stateWith([
      included, activity("2026-10-25T23:59:59-04:00"), activity("2026-11-02T00:00:00-05:00"),
      { ...included, disposition: "excluded" }, { ...included, sport: "cycling" },
      { ...included, disposition: "pending" },
    ]), result);
    expect(series.values).toEqual([10, 10, 10, 10, 10, 10, 10]);
  });
  it("keeps seven dates across the spring-forward week", () => {
    const series = weekRecapTraining(stateWith([activity("2026-03-08T23:30:00-04:00")]), {
      ...result, periodStart: "2026-03-02T05:00:00Z", periodEnd: "2026-03-09T04:00:00Z",
    });
    expect(series.values).toEqual([0, 0, 0, 0, 0, 0, 10]);
    expect(series.labels.at(-1)).toBe("Mar 8");
  });
  it("retains non-GPS strength minutes and reports missing history honestly", () => {
    const strength = { ...result, sport: "strength" as const };
    const session = { ...activity("2026-10-27T16:00:00Z", 1800), sport: "strength" as const, distanceM: 0 };
    expect(weekRecapTraining(stateWith([session]), strength).values.at(-1)).toBe(30);
    expect(weekRecapTraining(stateWith([]), strength).available).toBe(false);
  });
  it("does not include manual sessions in GPS results", () => {
    expect(weekRecapTraining(stateWith([activity("2026-10-27T16:00:00Z")]), { ...result, track: "verified" }).available).toBe(false);
  });
  it("computes cumulative effort values across the week", () => {
    const series = weekRecapTraining(stateWith([
      activity("2026-10-26T16:00:00Z", 600),
      activity("2026-10-28T16:00:00Z", 1200),
    ]), result);
    expect(series.hasEffort).toBe(true);
    expect(series.effortValues[0]).toBeGreaterThan(0);
    expect(series.effortValues[2]).toBeGreaterThan(series.effortValues[0]!);
    expect(series.effortValues.at(-1)).toBeCloseTo(series.effortValues[2]!, 6);
  });
});

describe("week recap next round", () => {
  it("formats upcoming countdown and renewal state", () => {
    const state = {
      ...freshState(new Date("2026-11-02T00:00:00Z")),
      demoNow: "2026-11-01T17:00:00Z",
      enrollments: [{
        sport: "running" as const,
        waveStart: "2026-11-02T11:00:00Z",
        weekEnd: "2026-11-09T05:00:00Z",
        capacity: 8,
        peerIds: [],
        syntheticIds: [],
        autoEnrollNext: true,
      }],
    };
    const next = weekRecapNextRound(state, result);
    expect(next.active).toBe(true);
    expect(next.pill).toBe("Starts in 18h");
    expect(next.subtext).toBe("Renews after this round.");
  });
  it("handles missing enrollment honestly", () => {
    const next = weekRecapNextRound(stateWith([]), result);
    expect(next.active).toBe(false);
    expect(next.pill).toBe("Not joined");
  });
});

describe("week recap podium", () => {
  it("orders top 3 replay finishers as 2nd, 1st, 3rd and respects blocked ids", () => {
    const replay: CompetitionReplay = {
      sport: "running",
      track: "open",
      periodStart: result.periodStart,
      periodEnd: result.periodEnd,
      through: result.periodEnd,
      scope: "field",
      athletes: [
        { id: "a", name: "Alice Park", you: true },
        { id: "b", name: "Bob Chen", you: false },
        { id: "c", name: "Carla Diaz", you: false },
      ],
      events: [
        { id: "1", athleteId: "a", at: "2026-10-27T12:00:00Z", distanceM: 9656, movingSec: 3000, effort: 10.4 },
        { id: "2", athleteId: "b", at: "2026-10-27T12:00:00Z", distanceM: 8047, movingSec: 2700, effort: 8.6 },
        { id: "3", athleteId: "c", at: "2026-10-27T12:00:00Z", distanceM: 4828, movingSec: 1800, effort: 5.2 },
      ],
    };
    const slots = weekRecapPodium(replay, { ...stateWith([]), name: "Alice Park", units: "us" }, result);
    expect(slots.map(s => `${s.step}:${s.entry?.name}:${s.entry?.metricLabel}`))
      .toEqual(["2:Bob Chen:5.0 mi", "1:Alice Park:6.0 mi", "3:Carla Diaz:3.0 mi"]);
    const filtered = weekRecapPodium(replay, { ...stateWith([]), name: "Alice Park", units: "us" }, result, ["b"]);
    expect(filtered.map(s => `${s.step}:${s.entry?.name ?? "empty"}`)).toEqual(["2:Carla Diaz", "1:Alice Park", "3:empty"]);
  });
  it("always renders all 3 podium slots even when fieldSize is 1", () => {
    const solo = weekRecapPodium(null, { ...stateWith([]), name: "Alice Park", units: "us" }, { ...result, place: 1, fieldSize: 1 });
    expect(solo.map(s => s.step)).toEqual([2, 1, 3]);
    expect(solo[0]?.entry).toBeNull();
    expect(solo[1]?.entry?.you).toBe(true);
    expect(solo[2]?.entry).toBeNull();
  });
});

describe("week recap highlights, breakdown, hr ranges & non-race fallback", () => {
  it("computes deterministic field highlights and week breakdown metrics without score/effort", () => {
    const state = {
      ...stateWith([
        activity("2026-10-27T12:00:00Z", { id: "a1", distanceM: 5000, movingSec: 1800, avgHr: 152 }),
        activity("2026-10-29T12:00:00Z", { id: "a2", distanceM: 8047, movingSec: 2700, avgHr: 168 }),
      ]),
      units: "us" as const,
      name: "Alice Park",
    };
    const highlights = weekRecapHighlights(null, state, { ...result, distanceM: 13047, movingSec: 4500 });
    expect(highlights.length).toBeGreaterThanOrEqual(2);
    expect(highlights[0]?.title).toContain("athletes in field");

    const breakdown = weekRecapBreakdown(state, { sport: "running", periodStart: result.periodStart, periodEnd: result.periodEnd, result });
    expect(breakdown.stats.map(s => `${s.label}:${s.value}`)).toEqual([
      "Total time:75 min",
      "Sessions:2",
      "Best session:5.0 mi",
    ]);

    const hr = weekRecapHeartRateRanges(state, { sport: "running", periodStart: result.periodStart, periodEnd: result.periodEnd, result });
    expect(hr.totalMinutes).toBe(75);
    expect(hr.ranges.map(r => `${r.id}:${r.minutes}m`)).toEqual(["160-180:45m", "140-160:30m"]);
  });

  it("buckets granular routeReplay heart rate samples when available", () => {
    const state = stateWith([{
      ...activity("2026-10-27T12:00:00Z", { id: "g1", movingSec: 240, avgHr: null }),
      routeReplay: [
        { progress: 0, elapsedSec: 0, heartRate: 130 },
        { progress: 0.5, elapsedSec: 120, heartRate: 145 },
        { progress: 1, elapsedSec: 240, heartRate: 170 },
      ],
    }]);
    const hr = weekRecapHeartRateRanges(state, { sport: "running", periodStart: result.periodStart, periodEnd: result.periodEnd, result });
    expect(hr.hasGranular).toBe(true);
    expect(hr.ranges.map(r => r.id)).toEqual(["160-180", "140-160"]);
  });

  it("detects non-race closed week activities for Week breakdown auto-open", () => {
    const base = freshState(new Date("2026-11-02T15:00:00Z"));
    const withWorkouts = {
      ...base,
      demoNow: "2026-11-02T15:00:00Z",
      activities: [activity("2026-10-28T15:00:00Z", { id: "w1", sport: "cycling", movingSec: 2400 })],
    };
    expect(nonRaceWeekBreakdownTarget(withWorkouts)?.sport).toBe("cycling");
    const pages = weekRecapPages([], nonRaceWeekBreakdownTarget(withWorkouts));
    expect(pages).toHaveLength(1);
    expect(pages[0]?.kind).toBe("effort");
  });
});
