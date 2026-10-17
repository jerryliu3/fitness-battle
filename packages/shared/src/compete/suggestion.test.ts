import { describe, expect, it } from "vitest";
import { freshState } from "./engine";
import { suggestionForState, suggestOpen, suggestToday } from "./suggestion";
import type { Activity } from "./sports";

function run(partial: Partial<Activity> & Pick<Activity, "id" | "startedAt" | "distanceM">): Activity {
  return {
    sport: "running",
    movingSec: (partial.distanceM / 1000) * 6 * 60,
    avgHr: 140,
    verified: true,
    source: "strava",
    provenance: "recorded",
    disposition: "counted",
    ...partial,
  };
}

describe("suggestOpen", () => {
  const now = new Date("2026-10-13T15:00:00.000Z");

  it("suggests 30 easy minutes when nothing has been counted", () => {
    const suggestion = suggestOpen([], now);
    expect(suggestion.phase).toBe("open");
    expect(suggestion.kind).toBe("easy");
    expect(suggestion.minutes).toBe(30);
    expect(suggestion.distanceKm).toBeNull();
  });

  it("matches the length of last week's counted sessions", () => {
    const suggestion = suggestOpen(
      [
        run({ id: "a", startedAt: "2026-10-08T14:00:00.000Z", distanceM: 8000, movingSec: 48 * 60 }),
        run({ id: "b", startedAt: "2026-10-10T14:00:00.000Z", distanceM: 6000, movingSec: 36 * 60 }),
      ],
      now,
    );
    expect(suggestion.kind).toBe("easy");
    expect(suggestion.minutes).toBe(40);
    expect(suggestion.distanceKm).toBeGreaterThanOrEqual(3);
    expect(suggestion.distanceKm).toBeLessThanOrEqual(10);
  });

  it("rests after a full session yesterday even without a goal", () => {
    const suggestion = suggestOpen(
      [run({ id: "long", startedAt: "2026-10-12T14:00:00.000Z", distanceM: 12000, movingSec: 75 * 60 })],
      now,
    );
    expect(suggestion.kind).toBe("rest");
  });
});

describe("suggestToday", () => {
  const now = new Date("2026-10-13T15:00:00.000Z"); // Tuesday

  it("starts short when there is no counted history", () => {
    const suggestion = suggestToday(
      { distance: "5k", deadline: "2026-12-08" },
      [],
      now,
    );
    expect(suggestion.kind).toBe("easy");
    expect(suggestion.phase).toBe("build");
    expect(suggestion.minutes).toBe(30);
    expect(suggestion.distanceKm).toBeNull();
    expect(suggestion.reason).toContain("No counted running");
    expect(suggestion.title).toBe("Easy 30 min");
  });

  it("rests after a long run yesterday", () => {
    const suggestion = suggestToday(
      { distance: "10k", deadline: "2026-12-08" },
      [
        run({ id: "long", startedAt: "2026-10-12T14:00:00.000Z", distanceM: 14000, movingSec: 80 * 60 }),
        run({ id: "easy", startedAt: "2026-10-08T14:00:00.000Z", distanceM: 6000 }),
      ],
      now,
    );
    expect(suggestion.kind).toBe("rest");
    expect(suggestion.reason).toContain("14 km");
  });

  it("does not jump the long run more than 10 percent past the recent longest", () => {
    const sunday = new Date("2026-10-18T15:00:00.000Z");
    const suggestion = suggestToday(
      { distance: "marathon", deadline: "2027-02-14" },
      [
        run({ id: "long", startedAt: "2026-10-11T14:00:00.000Z", distanceM: 10000 }),
        run({ id: "easy", startedAt: "2026-10-07T14:00:00.000Z", distanceM: 5000 }),
      ],
      sunday,
    );
    expect(suggestion.kind).toBe("long");
    expect(suggestion.distanceKm).toBeLessThanOrEqual(11);
    expect(suggestion.distanceKm).toBeGreaterThan(10);
  });

  it("names race day and a passed deadline", () => {
    const race = suggestToday({ distance: "half", deadline: "2026-10-13" }, [], now);
    expect(race.kind).toBe("race");
    const past = suggestToday({ distance: "half", deadline: "2026-10-01" }, [], now);
    expect(past.phase).toBe("past");
  });

  it("does not add work after a run already recorded today", () => {
    const suggestion = suggestToday(
      { distance: "5k", deadline: "2026-12-08" },
      [run({ id: "today", startedAt: "2026-10-13T12:00:00.000Z", distanceM: 5000 })],
      now,
    );
    expect(suggestion.title).toBe("Already covered");
  });

  it("keeps the long day on the weekday with the most distance", () => {
    const sunday = new Date("2026-10-18T15:00:00.000Z");
    const suggestion = suggestToday(
      { distance: "10k", deadline: "2026-12-08" },
      [
        run({ id: "odd", startedAt: "2026-10-14T14:00:00.000Z", distanceM: 12000 }),
        run({ id: "sun-a", startedAt: "2026-10-11T14:00:00.000Z", distanceM: 8000 }),
        run({ id: "sun-b", startedAt: "2026-10-04T14:00:00.000Z", distanceM: 8000 }),
      ],
      sunday,
    );
    expect(suggestion.kind).toBe("long");
    expect(suggestion.distanceKm).toBeLessThanOrEqual(8.8);
  });

  it("uses the athlete's sport and treats any session today as covered", () => {
    const now = new Date("2026-10-13T15:00:00.000Z");
    const state = freshState(now);
    state.primary = "cycling";
    state.trainingGoal = { distance: "10k", deadline: "2026-12-08" };
    state.activities = [
      run({
        id: "ride",
        sport: "cycling",
        startedAt: "2026-10-13T12:00:00.000Z",
        distanceM: 30000,
        movingSec: 60 * 60,
      }),
    ];
    const covered = suggestionForState(state, now);
    expect(covered.title).toBe("Already covered");
    expect(covered.reason).toContain("cycling");

    state.activities = [
      run({
        id: "earlier",
        sport: "cycling",
        startedAt: "2026-10-10T12:00:00.000Z",
        distanceM: 25000,
        movingSec: 50 * 60,
      }),
    ];
    const planned = suggestionForState(state, now);
    expect(planned.kind).not.toBe("quality");
    expect(planned.reason).toContain("cycling");
    expect(planned.reason).not.toContain("No counted running");
  });

  it("does not grow a short history past 10 percent", () => {
    const sunday = new Date("2026-10-18T15:00:00.000Z");
    const suggestion = suggestToday(
      { distance: "10k", deadline: "2026-12-08" },
      [
        run({ id: "long", startedAt: "2026-10-11T14:00:00.000Z", distanceM: 1000 }),
        run({ id: "easy", startedAt: "2026-10-14T14:00:00.000Z", distanceM: 500 }),
      ],
      sunday,
    );
    expect(suggestion.kind).toBe("easy");
    expect(suggestion.distanceKm).toBeLessThanOrEqual(1.1);
    expect(suggestion.detail).not.toMatch(/hard|faster/);

    const tuesday = new Date("2026-10-13T15:00:00.000Z");
    const quality = suggestToday(
      { distance: "5k", deadline: "2026-12-08" },
      [run({ id: "only", startedAt: "2026-10-08T14:00:00.000Z", distanceM: 1000 })],
      tuesday,
    );
    expect(quality.kind).toBe("easy");
    expect(quality.distanceKm).toBeLessThanOrEqual(1.1);
    expect(quality.detail).not.toMatch(/hard|faster/);
    expect(quality.title).toContain(String(quality.distanceKm));
  });

  it("rests after a hard run even on the long weekday and during taper", () => {
    const sunday = new Date("2026-10-18T15:00:00.000Z");
    const longDay = suggestToday(
      { distance: "10k", deadline: "2026-12-08" },
      [
        run({ id: "sun-a", startedAt: "2026-10-04T14:00:00.000Z", distanceM: 8000 }),
        run({ id: "sun-b", startedAt: "2026-10-11T14:00:00.000Z", distanceM: 8000 }),
        run({ id: "yesterday", startedAt: "2026-10-17T14:00:00.000Z", distanceM: 14000, movingSec: 80 * 60 }),
      ],
      sunday,
    );
    expect(longDay.kind).toBe("rest");

    const taper = suggestToday(
      { distance: "half", deadline: "2026-10-20" },
      [run({ id: "yesterday", startedAt: "2026-10-12T14:00:00.000Z", distanceM: 14000, movingSec: 80 * 60 })],
      new Date("2026-10-13T15:00:00.000Z"),
    );
    expect(taper.kind).toBe("rest");
  });

  it("ignores sample calibration rows", () => {
    const suggestion = suggestToday(
      { distance: "5k", deadline: "2026-12-08" },
      [
        run({
          id: "sample",
          startedAt: "2026-10-12T12:00:00.000Z",
          distanceM: 20000,
          provenance: "demo",
          source: "history",
        }),
      ],
      now,
    );
    expect(suggestion.reason).toContain("No counted running");
  });

  it("suggests cycling workouts when primary sport is cycling", () => {
    const state = freshState(now);
    state.primary = "cycling";
    const suggestion = suggestionForState(state, now);
    expect(suggestion.detail).toContain("bike");
    expect(suggestion.detail).not.toContain("Walk or jog");
  });
});
