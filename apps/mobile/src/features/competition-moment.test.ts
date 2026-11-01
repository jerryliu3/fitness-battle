vi.mock("./use-competition-course", () => ({ useCompetitionCourse: () => ({ course: null, error: "", retry: vi.fn() }) }));
vi.mock("../lib/athlete-blocks", () => ({ useAthleteBlocks: () => ({ blocks: [], ready: true, setBlocked: vi.fn() }) }));
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { defaultFieldAppearance, applyDebugEvent, competitionMoments, freshState, momentStorageKey } from "@fitness-battle/shared";
const preferences = vi.hoisted(() => ({ reduced: true }));
vi.mock("../ui/use-reduced-motion", () => ({ useReducedMotion: () => preferences.reduced }));
vi.mock("react-native", () => ({ View: "View", Text: "Text", StyleSheet: { absoluteFill: {}, create: (value: unknown) => value } }));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 20, bottom: 20 }) }));
vi.mock("../lib/compete-store", () => ({ useCompeteStore: () => ({ accountKey: "a" }) }));
vi.mock("../ui/focus", () => ({ FocusButton: "FocusButton" }));
vi.mock("../lib/haptics", () => ({ playCue: vi.fn(), playPattern: vi.fn(() => vi.fn()), cancelHaptics: vi.fn() }));
vi.mock("../ui/field-course", () => ({ useFieldAppearance: () => [defaultFieldAppearance] }));
vi.mock("../ui/lane-track", () => ({ LaneTrack: "LaneTrack" }));
vi.mock("./geographic-course",()=>({GeographicCourse:"GeographicCourse"}));
import { CompetitionMoment } from "./competition-moment";

function moment() {
  const result = applyDebugEvent(freshState(new Date("2026-10-24T18:00:00Z")), "overtake", "a");
  const baselines = Object.fromEntries(Object.entries(result.baselines).map(([key,value]) => [momentStorageKey(key),value]));
  return competitionMoments(result.state,"a",key=>baselines[key])[0];
}
it("reduced motion offers Replay and Continue and confirms once", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let renderer!: ReactTestRenderer;
  const done = vi.fn();
  await act(async () => { renderer = create(createElement(CompetitionMoment, { moment: moment(), remaining: 1, onConfirm: done })); });
  const buttons = renderer.root.findAllByType("FocusButton" as never);
  expect(buttons.map(button => button.props.label)).toEqual(["Replay", "Continue"]);
  await act(async () => { buttons[1].props.onPress(); buttons[1].props.onPress(); });
  expect(done).toHaveBeenCalledOnce();
  await act(async () => renderer.unmount());
});
it("autoplays after map readiness, holds the final frame and replays on request", async () => {
  preferences.reduced = false;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let frame: (() => void) | undefined, now = 0;
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: () => void) => { frame = callback; return 1; }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(Date, "now").mockImplementation(() => now);
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(createElement(CompetitionMoment, { moment: moment(), remaining: 1, onConfirm: vi.fn() })); });
    const map = () => renderer.root.findByType("GeographicCourse" as never);
    expect(frame).toBeUndefined();
    expect(renderer.root.findAllByType("FocusButton" as never)).toHaveLength(0);
    await act(async () => map().props.onReady());
    await act(async () => { now = 30000; frame?.(); });
    expect(map().props.replay.done).toBe(true);
    await act(async () => map().props.onReady());
    expect(map().props.replay.done).toBe(true);
    await act(async () => renderer.root.findAllByType("FocusButton" as never).find(button => button.props.label === "Replay")!.props.onPress());
    expect(map().props.replay.done).toBe(false);
    expect(map().props.replay.count).toBe(0);
  } finally {
    await act(async () => renderer.unmount());
    preferences.reduced = true; vi.restoreAllMocks(); vi.unstubAllGlobals();
  }
});
