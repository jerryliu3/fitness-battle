vi.mock("@/features/course/use-competition-course", () => ({ useCompetitionCourse: () => ({ course: null, error: "", retry: vi.fn() }) }));
vi.mock("@/components/compete-context", () => ({
  useCompete: () => ({ state: freshState(new Date("2026-10-24T18:00:00Z")) }),
}));
vi.mock("@/features/course/geographic-course", () => ({ GeographicCourse: "GeographicCourse" }));
vi.mock("@/features/arena/compete-sheet", () => ({
  CompeteSheet: ({ overview, children, ...props }: { overview: unknown; children: unknown }) =>
    createElement("CompeteSheet", props, overview as never, children as never),
}));
vi.mock("@/features/arena/competition-panel", () => ({
  CompetitionPanel: ({
    standings,
    activity,
  }: {
    standings: unknown;
    activity: (visible: boolean) => unknown;
  }) => createElement("CompetitionPanel", null, standings as never, activity(true) as never),
}));
vi.mock("@/features/arena/race-updates", () => ({ RaceUpdates: "RaceUpdates" }));
vi.mock("@/features/field/components/standings-list", () => ({ StandingsList: "StandingsList" }));
vi.mock("@/features/field/components/field-view-switcher", () => ({ FieldViewSwitcher: "FieldViewSwitcher" }));
vi.mock("@/ui/sheet", () => ({ Sheet: "Sheet" }));
vi.mock("@/ui/rank-symbol", () => ({ RankAvatar: "RankAvatar" }));
vi.mock("@/ui/sport-activity-icon", () => ({ SportActivityIcon: "SportActivityIcon" }));
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { defaultFieldAppearance, applyDebugEvent, competitionMoments, freshState, momentStorageKey } from "@fitness-battle/shared";
const preferences = vi.hoisted(() => ({ reduced: true }));
vi.mock("motion/react", () => ({ useReducedMotion: () => preferences.reduced }));
vi.mock("@/lib/haptics", () => ({ playCue: vi.fn() }));
vi.mock("@/components/auth-context", () => ({ useAuth: () => ({ user: { id: "a" } }) }));
vi.mock("@/features/field/components/field-course", () => ({ useFieldAppearance: () => [defaultFieldAppearance] }));
vi.mock("@/features/focus/arena-lanes", () => ({ ArenaLanes: "ArenaLanes" }));
import { CompetitionMoment } from "./competition-moment";

it("reduced motion shows the final result in either direction and confirms at most once", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  for (const direction of ["overtake", "overtaken"] as const) {
    const result = applyDebugEvent(freshState(new Date("2026-10-24T18:00:00Z")), direction, "a");
    const baselines = Object.fromEntries(Object.entries(result.baselines).map(([k, v]) => [momentStorageKey(k), v]));
    const moment = competitionMoments(result.state, "a", k => baselines[k])[0];
    const done = vi.fn();
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(createElement(CompetitionMoment, { moment, dimension: "2d", remaining: 1, onConfirm: done }));
    });
    const buttons = renderer.root.findAllByType("button");
    expect(buttons[0].props["aria-label"]).toBe("Replay");
    expect(buttons[1].props.children).toBe("Continue");
    const field = renderer.root.findByType("ArenaLanes" as never);
    expect(field.props.immersive).toBe(true);
    expect(field.props.lanes).toHaveLength(moment.lanes.length);
    expect(field.props.lanes.find((lane: { you?: boolean }) => lane.you).value).toBe(moment.plan.youAfter);
    expect(field.props.appearance).toEqual(defaultFieldAppearance);
    const standings = renderer.root.findByType("StandingsList" as never);
    expect(standings.props.ranked.length).toBeGreaterThanOrEqual(4);
    expect(renderer.root.findByType("RaceUpdates" as never).props.moment).toBe(moment);
    expect(renderer.root.findByType("FieldViewSwitcher" as never).props.compact).toBe(true);
    await act(async () => { buttons[1].props.onClick(); buttons[1].props.onClick(); });
    expect(done).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  }
});

it("autoplays immediately, supports Replay and 2D switching, and lets Continue confirm before completion", async () => {
  preferences.reduced = false;
  let frame: ((now: number) => void) | undefined;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", vi.fn((cb: (now: number) => void) => { frame = cb; return 1; }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const result = applyDebugEvent(freshState(new Date("2026-10-24T18:00:00Z")), "overtake", "a");
  const baselines = Object.fromEntries(Object.entries(result.baselines).map(([key, value]) => [momentStorageKey(key), value]));
  const moment = competitionMoments(result.state, "a", key => baselines[key])[0];
  const done = vi.fn();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(createElement(CompetitionMoment, { moment, dimension: "4d", remaining: 2, onConfirm: done }));
    });
    const map = () => renderer.root.findByType("GeographicCourse" as never);
    const playback = () => renderer.root.findAllByType("button")[0];
    expect(playback().props["aria-label"]).toBe("Pause replay");
    expect(renderer.root.findAllByType("button")[1].props.children).toBe("Continue (1 more)");
    await act(async () => map().props.onReady());
    await act(async () => playback().props.onClick());
    expect(playback().props["aria-label"]).toBe("Play replay");
    await act(async () => playback().props.onClick());
    expect(playback().props["aria-label"]).toBe("Pause replay");
    await act(async () => { frame?.(performance.now() + 30000); });
    expect(map().props.replay.done).toBe(true);
    expect(playback().props["aria-label"]).toBe("Replay");
    await act(async () => {
      playback().props.onClick();
    });
    expect(map().props.replay.done).toBe(false);
    expect(playback().props["aria-label"]).toBe("Pause replay");
    await act(async () => {
      renderer.root.findByType("FieldViewSwitcher" as never).props.onChange("2d");
    });
    expect(renderer.root.findAllByType("GeographicCourse" as never)).toHaveLength(0);
    await act(async () => {
      renderer.root.findAllByType("button").find(button => button.props.children === "Continue (1 more)")!.props.onClick();
    });
    expect(done).toHaveBeenCalledTimes(1);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    preferences.reduced = true;
    vi.unstubAllGlobals();
  }
});

it("offers FieldViewSwitcher before the 3D scene finishes loading to switch to 2D", async () => {
  preferences.reduced = false;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const result = applyDebugEvent(freshState(new Date("2026-10-24T18:00:00Z")), "overtake", "a");
  const baselines = Object.fromEntries(Object.entries(result.baselines).map(([key, value]) => [momentStorageKey(key), value]));
  const moment = competitionMoments(result.state, "a", key => baselines[key])[0];
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(createElement(CompetitionMoment, { moment, dimension: "4d", remaining: 1, onConfirm: vi.fn() }));
    });
    await act(async () => {
      renderer.root.findByType("FieldViewSwitcher" as never).props.onChange("2d");
    });
    expect(renderer.root.findAllByType("GeographicCourse" as never)).toHaveLength(0);
    expect(renderer.root.findByType("ArenaLanes" as never)).toBeDefined();
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    preferences.reduced = true;
    vi.unstubAllGlobals();
  }
});
