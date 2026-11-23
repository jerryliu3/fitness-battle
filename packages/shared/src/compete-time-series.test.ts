import { describe, expect, it } from "vitest";
import {
  competeChartPreview,
  buildCompetitionMomentTimeSeriesModel,
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

    const enrollment = state.enrollments.find((item) => item.sport === "strength")!;
    enrollment.peerIds = ["real-rival"];
    enrollment.syntheticIds = [];
    enrollment.capacity = 2;
    enrollment.fieldBoard = {
      crewId: "solo",
      crewName: "Open Field",
      sport: "strength",
      waveStart: enrollment.waveStart,
      weekEnd: enrollment.weekEnd,
      capacity: 2,
      memberIds: ["you", "real-rival"],
      members: [{ id: "real-rival", name: "Rival", elo: 1000, effort: 40, movingSec: 1800, distanceM: 0 }],
      syntheticIds: [],
    };

    const initial = buildCompeteTimeSeriesModel(state, "strength", "open", now);
    expect(initial.unit).toBe("hrs");
    expect(initial.selectedAthlete.you).toBe(true);
    expect(initial.athletes.filter((a) => a.selected)).toHaveLength(1);
    expect(initial.dayTicks).toHaveLength(4);
    expect(initial.dayTicks[0]?.label).toBe("Day 1");
    expect(initial.dayTicks[0]?.x).toBe(initial.left);
    expect(initial.dayTicks.map((d) => d.label)).toEqual([
      "Day 1",
      "Day 2",
      "Day 3",
      "Day 4",
    ]);
    expect(initial.timeLabel).toMatch(/^Day \d/);

    const rival = initial.athletes.find((a) => !a.you)!;
    expect(rival).toBeDefined();

    const switched = buildCompeteTimeSeriesModel(state, "strength", "open", now, {
      selectedAthleteId: rival.id,
    });
    expect(switched.selectedAthlete.id).toBe(rival.id);
    expect(switched.selectedAthlete.you).toBe(false);
    expect(switched.athletes.filter((a) => a.selected)).toHaveLength(1);
    expect(switched.athletes.find((a) => a.you)?.selected).toBe(false);
    expect(switched.gapLabel).toMatch(/vs Anonymous Athlete|Tied with Anonymous Athlete/);
  });

  it("does not invent an overtake against an account that has only a current total", () => {
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
      activityId: "run-early",
      movingSec: 1800,
      distanceM: 3000,
      now: "2026-10-20T12:00:00Z",
      startedAt: "2026-10-20T10:00:00Z",
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

    const enrollment = state.enrollments.find((item) => item.sport === "running")!;
    enrollment.peerIds = ["real-rival"];
    enrollment.syntheticIds = [];
    enrollment.capacity = 2;
    enrollment.fieldBoard = {
      crewId: "solo",
      crewName: "Open Field",
      sport: "running",
      waveStart: enrollment.waveStart,
      weekEnd: enrollment.weekEnd,
      capacity: 2,
      memberIds: ["you", "real-rival"],
      members: [{ id: "real-rival", name: "Rival", elo: 1000, distanceM: 8000, movingSec: 2400 }],
      syntheticIds: [],
    };

    const liveModel = buildCompeteTimeSeriesModel(state, "running", "open", now);
    expect(liveModel.unit).toBe("mi");
    expect(liveModel.athletes.some((athlete) => athlete.id === "real-rival")).toBe(true);
    expect(liveModel.overtakes).toEqual([]);
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
    expect(sleepModel.athletes).toHaveLength(1);
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

it("does not invent historical rival totals or places from a current-only roster", () => {
  const now = new Date("2026-10-22T18:00:00Z");
  const state = reduceCompete(freshState(new Date("2026-10-19T09:00:00Z")), { type: "opt-in", sport: "strength", now: "2026-10-19T09:00:00Z" });
  const enrollment = state.enrollments.find(e => e.sport === "strength")!;
  enrollment.peerIds = ["real-rival"];
  enrollment.syntheticIds = [];
  enrollment.capacity = 2;
  enrollment.fieldBoard = { crewId: "solo", crewName: "Open Field", sport: "strength", waveStart: enrollment.waveStart, weekEnd: enrollment.weekEnd, capacity: 2, memberIds: ["you", "real-rival"], members: [{ id: "real-rival", name: "Rival", elo: 1000, effort: 120, movingSec: 3600, distanceM: 0 }], syntheticIds: [] };
  const model = buildCompeteTimeSeriesModel(state, "strength", "open", now, { scrubFraction: .1 });
  expect(model.historyAvailable).toBe(false);
  expect(model.isScrubbing).toBe(false);
  expect(model.cursorFraction).toBe(model.nowFraction);
  expect(model.athletes.find(a => a.id === "real-rival")?.vertices).toEqual([{ t: model.nowFraction, value: 1 }]);
  expect(model.overtakes).toEqual([]);
  const filtered = buildCompeteTimeSeriesModel(state, "strength", "open", now, { hiddenIds: ["real-rival"], scrubFraction: .1 });
  expect(filtered.athletes.some(athlete => athlete.id === "real-rival")).toBe(false);
  expect(filtered.historyAvailable).toBe(true);
  expect(filtered.isScrubbing).toBe(true);
});

it("enables scrub as soon as the wave clock is running", () => {
  const start = new Date("2026-10-19T09:00:00Z");
  const state = reduceCompete(freshState(start), {
    type: "opt-in",
    sport: "strength",
    now: start.toISOString(),
  });
  const enrollment = state.enrollments.find(item => item.sport === "strength")!;
  const period = { startsAt: new Date(enrollment.waveStart) };
  const atStart = buildCompeteTimeSeriesModel(
    state,
    "strength",
    "open",
    period.startsAt,
  );
  expect(atStart.historyAvailable).toBe(false);
  const afterStart = buildCompeteTimeSeriesModel(
    state,
    "strength",
    "open",
    new Date(period.startsAt.getTime() + 1),
  );
  expect(afterStart.historyAvailable).toBe(true);
});

it("connects recorded activity with diagonal lines, without vertical step jumps", () => {
  const now = new Date("2026-10-22T18:00:00Z");
  let state = reduceCompete(freshState(new Date("2026-10-19T09:00:00Z")), { type: "opt-in", sport: "strength", now: "2026-10-19T09:00:00Z" });
  state = reduceCompete(state, { type: "log-manual", sport: "strength", activityId: "lift", movingSec: 3600, distanceM: 0, startedAt: "2026-10-22T14:00:00Z", now: now.toISOString() });
  const model = buildCompeteTimeSeriesModel(state, "strength", "open", now, { view: "trajectory" });
  const vertices = model.selectedAthlete.vertices;
  expect(vertices.length).toBeGreaterThanOrEqual(2);
  const last = vertices[vertices.length - 1]!;
  expect(last.value).toBe(model.selectedAthlete.currentValue);
  expect(interpolateTimeSeriesAt(vertices, 0)).toBe(0);
  expect(interpolateTimeSeriesAt(vertices, model.nowFraction)).toBe(model.selectedAthlete.currentValue);
  const verticalJump = vertices.findIndex((v, i) => i > 0 && v.t === vertices[i - 1]!.t && v.value !== vertices[i - 1]!.value);
  expect(verticalJump).toBe(-1);
  expect(model.view).toBe("trajectory");
  expect(model.overtakes).toEqual([]);
});

it("uses step functions and computes overtakes on event completion in event view", () => {
  const start = new Date("2026-10-19T09:00:00Z");
  const now = new Date("2026-10-23T18:00:00Z");
  let state = reduceCompete(freshState(start), { type: "opt-in", sport: "strength", now: start.toISOString() });
  // Big session that lifts you past one or more synthetic rivals at the event timestamp
  state = reduceCompete(state, {
    type: "log-manual",
    sport: "strength",
    activityId: "lift-big",
    movingSec: 28800,
    distanceM: 0,
    startedAt: "2026-10-22T14:00:00Z",
    now: "2026-10-22T18:00:00Z",
  });
  state = {
    ...state,
    activities: state.activities.map((a) => ({ ...a, avgHr: 185, provenance: "recorded" })),
  };
  const enrollment = state.enrollments.find((e) => e.sport === "strength")!;
  enrollment.peerIds = ["synth:strength:0"];
  enrollment.syntheticIds = ["synth:strength:0"];
  enrollment.capacity = 2;
  enrollment.fieldBoard = {
    crewId: "solo",
    crewName: "Open Field",
    sport: "strength",
    waveStart: enrollment.waveStart,
    weekEnd: enrollment.weekEnd,
    capacity: 2,
    memberIds: ["you", "synth:strength:0"],
    members: [{ id: "synth:strength:0", name: "Rival", elo: 1000, effort: 15, movingSec: 1800, distanceM: 0 }],
    syntheticIds: ["synth:strength:0"],
  };

  const trajectory = buildCompeteTimeSeriesModel(state, "strength", "open", now, { view: "trajectory" });
  expect(trajectory.view).toBe("trajectory");
  expect(trajectory.overtakes).toEqual([]);

  const eventModel = buildCompeteTimeSeriesModel(state, "strength", "open", now);
  expect(eventModel.view).toBe("event");
  const vertices = eventModel.selectedAthlete.vertices;
  expect(eventModel.selectedAthlete.currentValue).toBeGreaterThan(0);
  const rampStartIdx = vertices.findIndex((v, i) => i > 0 && v.value === 0 && vertices[i + 1] && vertices[i + 1]!.value > 0 && vertices[i + 1]!.t > v.t);
  expect(rampStartIdx).toBeGreaterThanOrEqual(0);
  expect(eventModel.overtakes.length, JSON.stringify({ overtakes: eventModel.overtakes, athletes: eventModel.athletes.map(a => ({ id: a.id, v: a.currentValue, pts: a.vertices })) })).toBeGreaterThan(0);
});


it("keeps captured moment chart values, ranks and paths aligned with every replay frame", async () => {
  const { competitionMomentScene } = await import("./competition-moments");
  const moment = {
    id: "captured", sport: "strength" as const, unit: "hrs" as const,
    lanes: [
      { id: "you", name: "Alex", initials: "A", you: true, value: 3 },
      { id: "peer", name: "Riley", initials: "R", value: 2 },
    ],
    plan: {
      youId: "you", youBefore: 1, youAfter: 3, hasOvertake: true,
      overtakenIds: ["peer"], rankBefore: 2, rankAfter: 1,
      rivals: { peer: { startValue: 2, endValue: 2, overtaken: true } },
    },
  } as unknown as import("./competition-moments").CompetitionMoment;
  for (const progress of [0, 0.3, 0.5, 0.8, 1]) {
    const frame = competitionMomentScene(moment, progress);
    const chart = buildCompetitionMomentTimeSeriesModel(moment, progress);
    for (const row of frame.ranked) {
      const athlete = chart.athletes.find(athlete => athlete.id === row.id)!;
      expect(athlete.valueAtCursor).toBeCloseTo(row.value);
      expect(athlete.placeAtCursor).toBe(row.place);
      expect(athlete.polyline.endsWith(`${athlete.cursorX.toFixed(1)},${athlete.cursorY.toFixed(1)}`)).toBe(true);
    }
  }
});

it("pins queued events to Day 1 and counts a shortened event from its own start", () => {
  const now = new Date("2026-11-18T15:00:00Z");
  const state = freshState(now);
  state.enrollments = [{ sport: "strength", waveStart: "2026-11-19T05:00:00Z", weekEnd: "2026-11-23T05:00:00Z", peerIds: [], syntheticIds: [], capacity: 8, autoEnrollNext: true }];
  const queued = buildCompeteTimeSeriesModel(state, "strength", "open", now);
  expect(queued.nowFraction).toBe(0);
  expect(queued.dayTicks.map(tick => tick.label)).toEqual(["Day 1"]);
  expect(queued.athletes.every(athlete => athlete.cursorX === queued.left && athlete.valueAtCursor === 0)).toBe(true);
  const preview = competeChartPreview(queued);
  expect(preview.athletes.every(athlete => athlete.x === preview.left)).toBe(true);
  const started = buildCompeteTimeSeriesModel(state, "strength", "open", new Date("2026-11-20T17:00:00Z"));
  expect(started.dayTicks.map(tick => tick.label)).toEqual(["Day 1", "Day 2"]);
  const ended = buildCompeteTimeSeriesModel(state, "strength", "open", new Date("2026-11-23T05:00:00Z"));
  expect(ended.dayTicks.map(tick => tick.label)).toEqual(["Day 1", "Day 2", "Day 3", "Day 4"]);
});

it("keeps seven event days across the daylight saving boundary", () => {
  const now = new Date("2026-11-01T18:00:00Z");
  const state = freshState(now);
  state.enrollments = [{ sport: "strength", waveStart: "2026-10-26T04:00:00Z", weekEnd: "2026-11-02T05:00:00Z", peerIds: [], syntheticIds: [], capacity: 8, autoEnrollNext: true }];
  const model = buildCompeteTimeSeriesModel(state, "strength", "open", now);
  expect(model.dayTicks.map(tick => tick.label)).toEqual(["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"]);
  expect(model.timeLabel).toMatch(/^Day 7/);
});
