import { describe, it, expect } from "vitest";
import {
  arenaWindow,
  arenaPosition,
  clampArenaLaneCenter,
  orderedArenaLanes,
  fitArenaWindow,
  reconcileArenaOvertake,
  stepArenaOvertake,
  formatArenaOvertakeStatus,
  arenaBaselineStorageKey,
  readArenaBaseline,
  serializeArenaBaseline,
  type ArenaSceneLane,
} from "./arena-view";
import { seedArenaBaselinesFromState } from "./phone-views";
import { freshState, reduceCompete } from "./compete/engine";
describe("distance viewport", () => {
  it("centers the athlete without compressing an extreme field", () => {
    const w = arenaWindow(23.4, 6);
    expect((w.min + w.max) / 2).toBe(23.4);
    expect(arenaPosition(23.4, w).fraction).toBeCloseTo(0.5);
    expect(arenaPosition(500, w).edge).toBe("ahead");
    expect(arenaPosition(0, w).edge).toBe("behind");
  });
  it("keeps zero visible and finite at the start and after invalid inputs", () => {
    expect(arenaPosition(0, arenaWindow(0, 6)).fraction).toBe(0.5);
    expect(arenaWindow(NaN, Infinity)).toEqual({
      min: -3,
      max: 3,
      center: 0,
      span: 6,
    });
    expect(arenaWindow(-5, 0.01).span).toBe(0.5);
  });
  it("places you in a stable middle lane and never ranks a ghost", () => {
    const lanes = [
      { id: "z" },
      { id: "me", you: true },
      { id: "ghost", ghost: true },
      { id: "a" },
    ];
    expect(orderedArenaLanes(lanes).map((l) => l.id)).toEqual(["a", "me", "z"]);
    expect(lanes).toHaveLength(4);
  });
  it("fits all actual athletes only when explicitly requested", () => {
    const fit = fitArenaWindow([
      { id: "a", name: "A", initials: "A", value: 100 },
      { id: "g", name: "Past", initials: "P", value: 999, ghost: true },
    ]);
    expect(arenaPosition(100, fit).edge).toBeNull();
    expect(fit.span).toBeCloseTo(115);
  });
  it("clamps center in 2D lanes so the start line remains near the bottom", () => {
    // When center is 0 (start line) and span is 20, center is clamped to 8.6
    const clampedCenter = clampArenaLaneCenter(0, 20);
    expect(clampedCenter).toBeCloseTo(8.6);
    // At center = 8.6, start line (0) is at fraction 0.93 (near bottom of visual)
    const pos = arenaPosition(0, { center: clampedCenter, span: 20 });
    expect(pos.fraction).toBeCloseTo(0.93);
    expect(pos.edge).toBeNull();

    // When athlete has progressed well forward (e.g. 30 km), athlete remains centered
    expect(clampArenaLaneCenter(30, 20)).toBe(30);
  });
});

describe("arena overtake reconciliation & motion", () => {
  const sampleLanes: ArenaSceneLane[] = [
    { id: "you", name: "You", initials: "YO", value: 15.2, you: true },
    { id: "mara", name: "Mara", initials: "MA", value: 13.8 },
    { id: "jules", name: "Jules", initials: "JU", value: 14.9 },
    { id: "noor", name: "Noor", initials: "NO", value: 19.2 },
    { id: "ghost", name: "Past You", initials: "PY", value: 14.0, ghost: true },
  ];

  it("returns null when there is no baseline or the user did not advance", () => {
    expect(reconcileArenaOvertake(sampleLanes, null)).toBeNull();
    expect(
      reconcileArenaOvertake(sampleLanes, {
        you: 15.2,
        mara: 13.8,
        jules: 14.9,
        noor: 19.2,
      }),
    ).toBeNull();
  });

  it("uses a two-beat stagger when the user overtakes a rival and rivals also moved", () => {
    const plan = reconcileArenaOvertake(sampleLanes, {
      you: 12.6,
      mara: 13.0, // moved to 13.8
      jules: 14.2, // moved to 14.9
      noor: 18.5, // moved to 19.2
    });
    expect(plan).not.toBeNull();
    expect(plan!.hasOvertake).toBe(true);
    expect(plan!.anyRivalMoved).toBe(true);
    expect(plan!.overtakenIds).toEqual(["mara", "jules"]);
    expect(plan!.rankBefore).toBe(4);
    expect(plan!.rankAfter).toBe(2);
    expect(plan!.rivalSlideEnd).toBeGreaterThan(0);

    // Beat 1: Rivals slide from startValue to endValue while You wait at youBefore
    const midSlide = stepArenaOvertake(plan!, plan!.rivalSlideEnd * 0.5, 6);
    expect(midSlide.phase).toBe("rival-slide");
    expect(midSlide.youValue).toBeCloseTo(12.6);
    expect(midSlide.laneValues.mara).toBeGreaterThan(13.0);
    expect(midSlide.laneValues.mara).toBeLessThan(13.8);
    expect(formatArenaOvertakeStatus(plan!, midSlide, "km")).toEqual({
      headline: "Updating field positions…",
      detail: null,
    });

    // Beat 2: Rivals are settled at endValue and You surge past with afterburn speed
    const midRun = stepArenaOvertake(plan!, 0.6, 6);
    expect(midRun.phase).toBe("overtake");
    expect(midRun.laneValues.mara).toBeCloseTo(13.8);
    expect(midRun.laneValues.jules).toBeCloseTo(14.9);
    expect(midRun.speed).toBeGreaterThan(0.5);
    expect(midRun.youValue).toBeGreaterThan(13.8);
    expect(midRun.rivalEffects.mara?.isPassed).toBe(true);
    expect(formatArenaOvertakeStatus(plan!, midRun, "km")).toEqual({
      headline: "Making your move · +2.6 km",
      detail: null,
    });

    // Final settle: You reach youAfter (#2)
    const done = stepArenaOvertake(plan!, 1, 6);
    expect(done.phase).toBe("done");
    expect(done.youValue).toBeCloseTo(15.2);
    expect(done.currentRank).toBe(2);
    expect(done.passedCount).toBe(2);
    expect(formatArenaOvertakeStatus(plan!, null, "km")).toEqual({
      headline: "#4 → #2",
      detail: "2 overtakes",
    });
  });

  it("does not count a rival as overtaken when the user was already ahead of them before the sync", () => {
    const plan = reconcileArenaOvertake(
      [
        { id: "you", name: "You", initials: "YO", value: 16.0, you: true },
        { id: "mara", name: "Mara", initials: "MA", value: 15.0 },
      ],
      {
        you: 14.0,
        mara: 12.0, // Mara was behind You (12.0 < 14.0) and is still behind You (15.0 < 16.0)
      },
    );
    expect(plan).not.toBeNull();
    expect(plan!.hasOvertake).toBe(false);
    expect(plan!.overtakenIds).toEqual([]);
    expect(plan!.rivalSlideEnd).toBe(0);
    expect(plan!.rivals.mara?.startValue).toBe(15.0);
    expect(formatArenaOvertakeStatus(plan!, null, "km")).toEqual({
      headline: "+2.0 km",
      detail: "moved forward",
    });
  });

  it("keeps rivals at their already updated positions when the user does not overtake anyone", () => {
    const noPassLanes: ArenaSceneLane[] = [
      { id: "you", name: "You", initials: "YO", value: 12.2, you: true },
      { id: "mara", name: "Mara", initials: "MA", value: 13.8 },
      { id: "noor", name: "Noor", initials: "NO", value: 19.2 },
    ];
    const plan = reconcileArenaOvertake(noPassLanes, {
      you: 10.0,
      mara: 12.5, // Mara moved to 13.8, but user (10.0 -> 12.2) does not overtake Mara
      noor: 18.0,
    });
    expect(plan).not.toBeNull();
    expect(plan!.hasOvertake).toBe(false);
    expect(plan!.rivalSlideEnd).toBe(0);
    // Rivals start immediately at their updated positions
    expect(plan!.rivals.mara?.startValue).toBe(13.8);
    expect(plan!.rivals.noor?.startValue).toBe(19.2);

    const startFrame = stepArenaOvertake(plan!, 0, 6);
    expect(startFrame.laneValues.mara).toBe(13.8);
    expect(startFrame.youValue).toBe(10.0);

    const midFrame = stepArenaOvertake(plan!, 0.5, 6);
    expect(midFrame.youValue).toBeGreaterThan(10.0);
    expect(midFrame.youValue).toBeLessThan(12.2);
    expect(midFrame.speed).toBeGreaterThan(0.5);
  });

  it("serializes and reads period-and-unit-scoped arena baselines", () => {
    const key = arenaBaselineStorageKey("acct", "running", "open");
    expect(key).toBe("fb-arena-baseline:acct:running:open");
    const raw = serializeArenaBaseline(
      "2026-10-12T00:00:00.000Z",
      sampleLanes,
      "km",
    );
    expect(readArenaBaseline(raw, "2026-10-05T00:00:00.000Z", "km")).toBeNull();
    expect(readArenaBaseline(raw, "2026-10-12T00:00:00.000Z", "mi")).toBeNull();
    const parsed = readArenaBaseline(raw, "2026-10-12T00:00:00.000Z", "km");
    expect(parsed).toEqual({
      you: 15.2,
      mara: 13.8,
      jules: 14.9,
      noor: 19.2,
    });
  });

  it("seeds baselines once per (periodStart, unit) and re-seeds when unit changes", () => {
    const store = new Map<string, string>();
    const base = freshState();
    const state = reduceCompete(base, {
      type: "opt-in",
      sport: base.primary,
    });
    seedArenaBaselinesFromState(
      state,
      "guest",
      (k) => store.get(k) ?? null,
      (k, v) => store.set(k, v),
    );
    const key = arenaBaselineStorageKey("guest", state.primary, "open");
    const first = store.get(key);
    expect(first).toBeTruthy();

    const parsedFirst = JSON.parse(first!) as {
      periodStart: string;
      unit: string;
    };
    expect(parsedFirst.unit).toBe("mi");

    // Mutate stored value to verify second call for same unit does not overwrite
    const custom = JSON.stringify({
      version: 1,
      periodStart: parsedFirst.periodStart,
      unit: parsedFirst.unit,
      values: { you: 1.5 },
    });
    store.set(key, custom);
    seedArenaBaselinesFromState(
      state,
      "guest",
      (k) => store.get(k) ?? null,
      (k, v) => store.set(k, v),
    );
    expect(store.get(key)).toBe(custom);

    // Changing units to metric ("metric") re-seeds with "km"
    seedArenaBaselinesFromState(
      { ...state, units: "metric" },
      "guest",
      (k) => store.get(k) ?? null,
      (k, v) => store.set(k, v),
    );
    expect(JSON.parse(store.get(key)!).unit).toBe("km");
  });
});
