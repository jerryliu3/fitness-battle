import { describe, expect, it } from "vitest";
import {
  competeChartPreview,
  buildCompeteTimeSeriesModel,
  buildSleepTimeSeriesModel,
  interpolateTimeSeriesAt,
} from "./compete-time-series";
import { demoSleepNight, freshState, reduceCompete } from "./compete";

describe("compete-time-series", () => {
  it("keeps the current position inside a finite, close preview even at the start of a wave", () => {
    for (const iso of ["2026-10-19T10:00:00Z", "2026-10-22T18:00:00Z"]) {
      const now = new Date(iso);
      const state = freshState(now);
      const preview = competeChartPreview(buildCompeteTimeSeriesModel(state, "strength", "open", now));
      const selected = preview.athletes.find(a => a.selected)!;
      expect(selected.x).toBeGreaterThanOrEqual(0);
      expect(selected.x).toBeLessThanOrEqual(preview.width);
      expect(selected.y).toBeGreaterThanOrEqual(0);
      expect(selected.y).toBeLessThanOrEqual(preview.height);
      expect(preview.athletes.every(a => !/NaN|Infinity/.test(a.points))).toBe(true);
    }
  });
  it("defaults selection to you and deselects you when another athlete is selected", () => {
    const start = new Date("2026-10-19T09:00:00Z");
    const now = new Date("2026-10-22T18:00:00Z");
    let state = reduceCompete(freshState(start), {
      type: "opt-in",
      sport: "strength",
      now: start.toISOString(),
    });
    state = reduceCompete(state, {
      type: "log-manual",
      sport: "strength",
      activityId: "lift-1",
      movingSec: 3600,
      distanceM: 0,
      now: "2026-10-20T15:00:00Z",
      startedAt: "2026-10-20T14:00:00Z",
    });
    state = reduceCompete(state, {
      type: "log-manual",
      sport: "strength",
      activityId: "lift-2",
      movingSec: 4500,
      distanceM: 0,
      now: now.toISOString(),
      startedAt: "2026-10-22T14:00:00Z",
    });

    const initial = buildCompeteTimeSeriesModel(state, "strength", "open", now);
    expect(initial.unit).toBe("pts");
    expect(initial.selectedAthlete.you).toBe(true);
    expect(initial.athletes.filter((a) => a.selected)).toHaveLength(1);
    expect(initial.dayTicks).toHaveLength(7);

    const rival = initial.athletes.find((a) => !a.you)!;
    expect(rival).toBeDefined();

    const switched = buildCompeteTimeSeriesModel(state, "strength", "open", now, {
      selectedAthleteId: rival.id,
    });
    expect(switched.selectedAthlete.id).toBe(rival.id);
    expect(switched.selectedAthlete.you).toBe(false);
    expect(switched.athletes.filter((a) => a.selected)).toHaveLength(1);
    expect(switched.athletes.find((a) => a.you)?.selected).toBe(false);
    expect(switched.gapLabel).toMatch(/vs Guest|Tied with Guest/);
  });

  it("computes overtake crossover nodes only for the selected athlete and supports scrubbing", () => {
    const start = new Date("2026-10-19T09:00:00Z");
    const now = new Date("2026-10-24T18:00:00Z");
    let state = reduceCompete(freshState(start), {
      type: "opt-in",
      sport: "running",
      now: start.toISOString(),
    });
    state = reduceCompete(state, {
      type: "log-manual",
      sport: "running",
      activityId: "run-big",
      movingSec: 7200,
      distanceM: 32000,
      now: now.toISOString(),
      startedAt: "2026-10-24T14:00:00Z",
    });

    const liveModel = buildCompeteTimeSeriesModel(state, "running", "open", now);
    expect(liveModel.unit).toBe("mi");
    expect(liveModel.overtakes.length).toBeGreaterThan(0);
    expect(
      liveModel.overtakes.every((o) => o.id.startsWith("you:pass:")),
    ).toBe(true);

    const earlyScrub = buildCompeteTimeSeriesModel(state, "running", "open", now, {
      scrubFraction: 0.1,
    });
    expect(earlyScrub.isScrubbing).toBe(true);
    expect(earlyScrub.selectedAthlete.valueAtCursor).toBe(0);
    expect(earlyScrub.overtakes).toHaveLength(0);
  });

  it("builds a sleep time-series model aligned with weekly sleep standings", () => {
    const now = new Date("2026-10-23T15:00:00Z");
    const state = freshState(new Date("2026-10-19T09:00:00Z"));
    state.healthRatings = state.healthRatings.map((r) => ({
      ...r,
      optedIn: true,
    }));
    state.sleepNights = [
      demoSleepNight("oura", "2026-10-20"),
      demoSleepNight("oura", "2026-10-21"),
      demoSleepNight("oura", "2026-10-22"),
    ];

    const sleepModel = buildSleepTimeSeriesModel(state, now);
    expect(sleepModel.unit).toBe("score");
    expect(sleepModel.yMax).toBe(100);
    expect(sleepModel.athletes.length).toBeGreaterThan(1);
    expect(sleepModel.selectedAthlete.you).toBe(true);
    expect(sleepModel.selectedAthlete.currentValue).toBeGreaterThan(0);
  });

  it("interpolates piecewise-linear vertices accurately", () => {
    const vertices = [
      { t: 0, value: 0 },
      { t: 0.5, value: 10 },
      { t: 1, value: 30 },
    ];
    expect(interpolateTimeSeriesAt(vertices, 0)).toBe(0);
    expect(interpolateTimeSeriesAt(vertices, 0.25)).toBeCloseTo(5);
    expect(interpolateTimeSeriesAt(vertices, 0.75)).toBeCloseTo(20);
    expect(interpolateTimeSeriesAt(vertices, 1)).toBe(30);
  });
});

it("fits every preview marker inside the axes and honors fullscreen plot height", () => {
  const now = new Date("2026-10-22T18:00:00Z");
  const model = buildCompeteTimeSeriesModel(freshState(now), "strength", "open", now, { height: 460 });
  expect(model.height).toBe(460);
  const preview = competeChartPreview(model);
  expect(preview.yTicks.length).toBeGreaterThan(1);
  for (const athlete of preview.athletes) {
    expect(athlete.x).toBeGreaterThanOrEqual(preview.left);
    expect(athlete.x).toBeLessThanOrEqual(preview.right);
    expect(athlete.y).toBeGreaterThanOrEqual(preview.top);
    expect(athlete.y).toBeLessThanOrEqual(preview.bottom);
  }
});
