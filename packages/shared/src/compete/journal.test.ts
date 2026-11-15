import { describe, expect, it } from "vitest";
import {
  countsForTraining,
  isJournalActivity,
  maxStepsOnDay,
  walkingStepsInPeriod,
} from "./journal";
import type { Activity } from "./sports";
import { weeklyPeriodBounds } from "../period";

const manual: Activity = {
  id: "manual-1",
  sport: "running",
  startedAt: "2026-10-23T12:00:00Z",
  distanceM: 5000,
  movingSec: 1800,
  avgHr: null,
  source: "manual",
  provenance: "manual",
  verified: false,
  disposition: "counted",
};

const walkWorkout: Activity = {
  id: "walk-1",
  sport: "walking",
  startedAt: "2026-10-23T12:00:00Z",
  distanceM: 3000,
  movingSec: 2400,
  avgHr: 110,
  source: "strava",
  provenance: "recorded",
  verified: true,
  disposition: "counted",
};

const run: Activity = {
  ...walkWorkout,
  id: "run-1",
  sport: "running",
};

describe("journal activities", () => {
  it("treats manual and walk workouts as journal-only", () => {
    expect(isJournalActivity(manual)).toBe(true);
    expect(isJournalActivity(walkWorkout)).toBe(true);
    expect(isJournalActivity(run)).toBe(false);
    expect(isJournalActivity({ ...run, journalOnly: true })).toBe(true);
  });

  it("includes journal rows in training helpers but not compete ledger", async () => {
    const { countsOnTrack } = await import("./ledger");
    expect(countsForTraining(manual)).toBe(true);
    expect(countsOnTrack(manual, "open")).toBe(false);
    expect(countsOnTrack(run, "open")).toBe(true);
    expect(countsOnTrack({ ...run, journalOnly: true }, "open")).toBe(false);
  });
});

describe("walkingStepsInPeriod", () => {
  it("sums max steps per Eastern day through now", () => {
    const now = new Date("2026-10-23T18:00:00.000Z");
    const period = weeklyPeriodBounds(now);
    const steps = walkingStepsInPeriod(
      [
        { provider: "apple_health", day: "2026-10-20", steps: 4000 },
        { provider: "garmin", day: "2026-10-20", steps: 9000 },
        { provider: "apple_health", day: "2026-10-23", steps: 2500 },
      ],
      period.startsAt,
      period.endsAt,
      now,
    );
    expect(steps).toBe(9000 + 2500);
  });
});

it("maxStepsOnDay picks the highest provider count", () => {
  expect(
    maxStepsOnDay(
      [
        { provider: "a", day: "2026-10-01", steps: 100 },
        { provider: "b", day: "2026-10-01", steps: 250 },
      ],
      "2026-10-01",
    ),
  ).toBe(250);
});