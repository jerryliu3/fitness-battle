vi.mock("./use-competition-course", () => ({ useCompetitionCourse: () => ({ course: null, error: "", retry: vi.fn() }) }));
vi.mock("./notification-opt-in", () => ({ NotificationOptInStrip: "NotificationOptInStrip" }));
vi.mock("../lib/athlete-blocks", () => ({ useAthleteBlocks: () => ({ blocks: [], ready: true, setBlocked: vi.fn() }) }));
import { createElement, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { createOnboardingOvertakeMoment, ONBOARDING_REPLAY_TUNING, defaultFieldAppearance, applyDebugEvent, competitionMoments, freshState, momentStorageKey } from "@fitness-battle/shared";
const preferences = vi.hoisted(() => ({ reduced: true }));
vi.mock("../ui/use-reduced-motion", () => ({ useReducedMotion: () => preferences.reduced }));
vi.mock("react-native", () => ({ Animated: { Value: class { constructor(public v: number) {} setValue(v: number) { this.v = v; } }, timing: () => ({ start: () => {}, stop: () => {} }), View: "AnimatedView" }, useColorScheme: () => "light", AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) }, Pressable: "Pressable", View: "View", Text: "Text", StyleSheet: { absoluteFill: {}, create: (value: unknown) => value } }));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 20, bottom: 20 }) }));
vi.mock("../lib/compete-store", () => ({ useCompeteStore: () => ({ accountKey: "a", state: freshState(new Date("2026-10-24T18:00:00Z")) }) }));
vi.mock("../ui/focus", () => ((() => { const mock = { FocusButton: "FocusButton" }; return { ...mock, useFocusStyles: () => ("f" in mock ? mock.f : {}) }; })()));
vi.mock("../lib/haptics", () => ({ playCue: vi.fn(), playPattern: vi.fn(() => vi.fn()), cancelHaptics: vi.fn() }));
vi.mock("../ui/field-course", () => ({ useFieldAppearance: () => [defaultFieldAppearance] }));
vi.mock("../ui/lane-track", () => ({ LaneTrack: "LaneTrack" }));
vi.mock("../ui/field-ground-switcher", () => ({ FieldGroundSwitcher: "FieldGroundSwitcher" }));
vi.mock("./geographic-course", () => ({ GeographicCourse: "GeographicCourse" }));
vi.mock("../ui/compete-time-series-chart", () => ({ CompeteTimeSeriesChart: "CompeteTimeSeriesChart" }));
vi.mock("./competition-panel", () => ({
  CompetitionPanel: ({ standings, activity }: { standings: ReactNode; activity: (visible: boolean) => ReactNode }) =>
    createElement("CompetitionPanel", null, standings, activity(true)),
}));
vi.mock("./race-updates", () => ({ RaceUpdates: "RaceUpdates" }));
vi.mock("./standings-list", () => ({ StandingsList: "StandingsList" }));
vi.mock("./athlete-profile-sheet", () => ({ AthleteProfileSheet: "AthleteProfileSheet" }));
vi.mock("../ui/compete-sheet", () => ({
  CompeteSheet: ({ overview, children, ...props }: { overview: ReactNode; children: ReactNode }) =>
    createElement("CompeteSheet", props, overview, children),
}));
vi.mock("../ui/field-view-switcher", () => ({ FieldViewSwitcher: "FieldViewSwitcher" }));
vi.mock("../ui/app-icon", () => ({ AppIcon: "AppIcon" }));
vi.mock("../ui/section", () => ({
  AppText: ({ children, ...props }: { children: ReactNode }) => createElement("AppText", props, children),
  textStyle: () => ({}),
}));
import { CompetitionMoment } from "./competition-moment";

function moment() {
  const result = applyDebugEvent(freshState(new Date("2026-10-24T18:00:00Z")), "overtake", "a");
  const baselines = Object.fromEntries(Object.entries(result.baselines).map(([key, value]) => [momentStorageKey(key), value]));
  return competitionMoments(result.state, "a", key => baselines[key])[0];
}

it("reduced motion offers Replay icon, Continue, centered progress chip with overtake count, full ranked standings, and feed", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let renderer!: ReactTestRenderer;
  const done = vi.fn();
  const sample = moment();
  await act(async () => { renderer = create(createElement(CompetitionMoment, { moment: sample, remaining: 1, onConfirm: done })); });
  const playback = renderer.root.findAllByType("Pressable" as never)[0];
  expect(playback.props.accessibilityLabel).toBe("Replay");
  expect(playback.findByType("AppIcon" as never).props.name).toBe("replay");
  const buttons = renderer.root.findAllByType("FocusButton" as never);
  expect(buttons.map(button => button.props.label)).toEqual(["Continue"]);
  const texts = renderer.root.findAllByType("Text" as never).map(node => String(node.props.children));
  expect(texts.some(text => text.includes("added"))).toBe(true);
  expect(texts.some(text => text.includes("overtake"))).toBe(true);
  const standings = renderer.root.findByType("StandingsList" as never);
  expect(standings.props.ranked.length).toBeGreaterThanOrEqual(4);
  expect(renderer.root.findByType("RaceUpdates" as never).props.moment).toBe(sample);
  expect(renderer.root.findByType("RaceUpdates" as never).props.revealCount).toBeUndefined();
  await act(async () => { buttons[0].props.onPress(); buttons[0].props.onPress(); });
  expect(done).toHaveBeenCalledOnce();
  await act(async () => renderer.unmount());
});

it("autoplays after map readiness, toggles pause/play/replay icon, allows immediate Continue, and holds the final frame", async () => {
  preferences.reduced = false;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let frame: (() => void) | undefined, now = 0;
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: () => void) => { frame = callback; return 1; }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(Date, "now").mockImplementation(() => now);
  let renderer!: ReactTestRenderer;
  const done = vi.fn();
  try {
    await act(async () => { renderer = create(createElement(CompetitionMoment, { moment: moment(), remaining: 1, onConfirm: done })); });
    const map = () => renderer.root.findByType("GeographicCourse" as never);
    const playback = () => renderer.root.findAllByType("Pressable" as never)[0];
    const speed = () => renderer.root.findAllByType("Pressable" as never)[1];
    expect(frame).toBeUndefined();
    expect(playback().props.accessibilityLabel).toBe("Pause replay");
    expect(playback().findByType("AppIcon" as never).props.name).toBe("pause");
    expect(speed().props.accessibilityLabel).toBe("Playback speed 1 times");
    await act(async () => speed().props.onPress());
    expect(speed().props.accessibilityLabel).toBe("Playback speed 2 times");
    expect(renderer.root.findAllByType("FocusButton" as never).map(button => button.props.label)).toEqual(["Continue"]);
    await act(async () => map().props.onReady());
    expect(renderer.root.findByType("RaceUpdates" as never).props.revealCount).toBe(0);
    await act(async () => playback().props.onPress());
    expect(playback().props.accessibilityLabel).toBe("Play replay");
    expect(playback().findByType("AppIcon" as never).props.name).toBe("play");
    await act(async () => playback().props.onPress());
    expect(playback().findByType("AppIcon" as never).props.name).toBe("pause");
    await act(async () => { now = 30000; frame?.(); });
    expect(map().props.replay.done).toBe(true);
    expect(playback().props.accessibilityLabel).toBe("Replay");
    expect(playback().findByType("AppIcon" as never).props.name).toBe("replay");
    await act(async () => map().props.onReady());
    expect(map().props.replay.done).toBe(true);
    await act(async () => playback().props.onPress());
    expect(map().props.replay.done).toBe(false);
    expect(map().props.replay.count).toBe(0);
    expect(playback().findByType("AppIcon" as never).props.name).toBe("pause");
    await act(async () => renderer.root.findAllByType("FocusButton" as never).find(button => button.props.label === "Continue")!.props.onPress());
    expect(done).toHaveBeenCalledOnce();
  } finally {
    await act(async () => renderer.unmount());
    preferences.reduced = true; vi.restoreAllMocks(); vi.unstubAllGlobals();
  }
});

it("can play in 2D with view switcher and continue immediately when remaining > 1", async () => {
  preferences.reduced = false;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let frame: (() => void) | undefined;
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: () => void) => { frame = callback; return 1; }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  let renderer!: ReactTestRenderer;
  const done = vi.fn();
  try {
    await act(async () => { renderer = create(createElement(CompetitionMoment, { moment: moment(), remaining: 2, onConfirm: done })); });
    await act(async () => renderer.root.findByType("FieldViewSwitcher" as never).props.onChange("2d"));
    expect(renderer.root.findAllByType("GeographicCourse" as never)).toHaveLength(0);
    const next = renderer.root.findAllByType("FocusButton" as never).find(button => button.props.label === "Continue (1 more)");
    expect(next).toBeDefined();
    await act(async () => next!.props.onPress());
    expect(done).toHaveBeenCalledOnce();
  } finally {
    await act(async () => renderer.unmount());
    preferences.reduced = true; vi.restoreAllMocks(); vi.unstubAllGlobals();
  }
});


it("uses the onboarding presentation clock and finishes in eight seconds", async () => {
  preferences.reduced = false;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let tick: (() => void) | undefined, now = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => { tick = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(Date, "now").mockImplementation(() => now);
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(createElement(CompetitionMoment, { moment: createOnboardingOvertakeMoment("You", "cycling"), embedded: true, practice: true, remaining: 1, onConfirm: vi.fn(), replayTuning: ONBOARDING_REPLAY_TUNING })); });
    const map = () => renderer.root.findByType("GeographicCourse" as never);
    await act(async () => map().props.onReady());
    await act(async () => { now = 4300; tick?.(); });
    expect(map().props.replay).toMatchObject({ count: 1, done: false, zoomBoost: .6 });
    await act(async () => { now = 8000; tick?.(); });
    expect(map().props.replay).toMatchObject({ count: 1, done: true });
    expect(renderer.root.findByProps({ accessibilityLabel: "Replay" })).toBeTruthy();
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    preferences.reduced = true; vi.restoreAllMocks(); vi.unstubAllGlobals();
  }
});
