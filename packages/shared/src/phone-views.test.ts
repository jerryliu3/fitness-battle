import { describe, expect, it } from "vitest";
import { freshState, reduceCompete } from "./compete/engine";
import type { Activity, PeriodResult } from "./compete/sports";
import {
  CHECKPOINT_ANCHORS,
  awardCards,
  buildArenaModel,
  buildTodayRoute,
  countedActivityIds,
  newCountedIds,
} from "./phone-views";

const now = new Date("2026-10-15T15:00:00.000Z");

function run(
  partial: Partial<Activity> & Pick<Activity, "id" | "startedAt" | "distanceM">,
): Activity {
  return {
    sport: "running",
    movingSec: 30 * 60,
    avgHr: 140,
    verified: true,
    source: "strava",
    provenance: "recorded",
    disposition: "counted",
    ...partial,
  };
}

describe("today checkpoints", () => {
  it("puts the two latest counted sessions on the past discs and leaves the future blank", () => {
    const state = {
      ...freshState(now),
      activities: [
        run({ id: "old", startedAt: "2026-10-12T12:00:00.000Z", distanceM: 5000 }),
        run({ id: "new", startedAt: "2026-10-14T12:00:00.000Z", distanceM: 8000 }),
        run({
          id: "skip",
          startedAt: "2026-10-13T12:00:00.000Z",
          distanceM: 1000,
          disposition: "excluded",
        }),
        run({ id: "last-week", startedAt: "2026-10-08T12:00:00.000Z", distanceM: 9000 }),
      ],
    };
    const route = buildTodayRoute(state, now);
    const past = route.discs.filter((disc) => disc.role === "past");
    expect(past.map((disc) => disc.activityId)).toEqual(["old", "new"]);
    expect(past[1]?.volume).toBe("8.0 km");
    expect(route.discs.filter((disc) => disc.role === "today")).toHaveLength(1);
    expect(route.discs.filter((disc) => disc.role === "future")).toHaveLength(3);
    expect(route.discs.find((disc) => disc.role === "today")?.title).toBe(
      route.suggestion.title,
    );
    expect(route.discs.find((disc) => disc.id === "future-0")?.activityId).toBeNull();
  });

  it("seats a single counted session on the past disc nearest today", () => {
    const state = {
      ...freshState(now),
      activities: [
        run({ id: "only", startedAt: "2026-10-14T12:00:00.000Z", distanceM: 3000 }),
      ],
    };
    const past = buildTodayRoute(state, now).discs.filter((disc) => disc.role === "past");
    expect(past.map((disc) => disc.activityId)).toEqual(["only"]);
    expect(past[0]?.top).toBe(CHECKPOINT_ANCHORS.past.at(-1)?.top);
  });
});

describe("arena lanes", () => {
  it("draws you and a past-self ghost from the same checkpoint series", () => {
    let state = reduceCompete(freshState(now), { type: "opt-in", sport: "running" });
    state = {
      ...state,
      activities: [
        run({ id: "prior", startedAt: "2026-10-08T12:00:00.000Z", distanceM: 6000 }),
        run({ id: "live", startedAt: "2026-10-14T12:00:00.000Z", distanceM: 4000 }),
      ],
    };
    const arena = buildArenaModel(state, now);
    expect(arena.optedIn).toBe(true);
    expect(arena.unit).toBe("km");
    const you = arena.lanes.find((lane) => lane.you);
    const ghost = arena.lanes.find((lane) => lane.ghost);
    expect(you?.values[2]).toBeGreaterThan(0);
    expect(ghost?.values[2]).toBeGreaterThan(0);
    expect(arena.labels).toHaveLength(3);
  });

  it("stays empty until the athlete opts in", () => {
    const arena = buildArenaModel(freshState(now), now);
    expect(arena.optedIn).toBe(false);
    expect(arena.lanes.filter((lane) => !lane.ghost)).toHaveLength(0);
  });
});

describe("award cards and counted progress", () => {
  it("turns a settled week into a shelf card", () => {
    const result: PeriodResult = {
      id: "week-1",
      periodStart: "2026-10-05T00:00:00.000Z",
      periodEnd: "2026-10-12T00:00:00.000Z",
      sport: "running",
      track: "open",
      place: 1,
      fieldSize: 8,
      effort: 42,
      distanceM: 20000,
      movingSec: 3600,
      eloBefore: 1000,
      eloAfter: 1016,
      frozen: false,
      settledAt: "2026-10-12T00:00:00.000Z",
      acknowledgedAt: "2026-10-12T01:00:00.000Z",
    };
    const cards = awardCards({ ...freshState(now), periodResults: [result] });
    expect(cards).toHaveLength(1);
    expect(cards[0]?.headline).toBe("Took the field");
    expect(cards[0]?.place).toBe("1 / 8");
    expect(cards[0]?.delta).toBe("+16");
  });

  it("reports only ids that were not in the previous set", () => {
    const state = {
      ...freshState(now),
      activities: [
        run({ id: "a", startedAt: "2026-10-14T12:00:00.000Z", distanceM: 1000 }),
        run({
          id: "b",
          startedAt: "2026-10-14T18:00:00.000Z",
          distanceM: 1000,
          disposition: "pending",
        }),
      ],
    };
    expect(countedActivityIds(state)).toEqual(["a"]);
    expect(newCountedIds(["a"], ["a", "c"])).toEqual(["c"]);
    expect(newCountedIds([], ["a"])).toEqual(["a"]);
  });
});
