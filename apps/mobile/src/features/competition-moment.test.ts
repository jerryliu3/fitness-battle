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
vi.mock("../lib/haptics", () => ({ playCue: vi.fn() }));
vi.mock("../ui/field-course", () => ({ useFieldAppearance: () => [defaultFieldAppearance] }));
vi.mock("../ui/lane-track", () => ({ LaneTrack: "LaneTrack" }));
import { CompetitionMoment } from "./competition-moment";
it("reduced motion shows the final result in either direction and confirms at most once", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  for (const direction of ["overtake", "overtaken"] as const) {
    const result = applyDebugEvent(freshState(new Date("2026-10-24T18:00:00Z")), direction, "a");
    const baselines = Object.fromEntries(Object.entries(result.baselines).map(([k,v]) => [momentStorageKey(k),v]));
    const moment = competitionMoments(result.state, "a", k => baselines[k])[0];
    const done = vi.fn(); let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(createElement(CompetitionMoment, { moment, remaining: 1, onConfirm: done })); });
    const button = renderer.root.findByType("FocusButton" as never);
    expect(button.props.label).toBe("Back to the app →");
    const root = renderer.root.findAllByType("View" as never).find(view => view.props.onLayout)!;
    await act(async () => root.props.onLayout({ nativeEvent: { layout: { height: 844 } } }));
    const field = renderer.root.findByType("LaneTrack" as never);
    expect(field.props.fullscreen).toBe(true);
    expect(field.props.height).toBe(844);
    expect(field.props.lanes).toHaveLength(moment.lanes.length);
    expect(field.props.lanes.find((lane: { you?: boolean }) => lane.you).values[2]).toBe(moment.plan.youAfter);
    expect(field.props.appearance).toEqual(defaultFieldAppearance);
    await act(async () => { button.props.onPress(); button.props.onPress(); });
    expect(done).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  }
});

it("skipping playback shows final totals and waits for explicit confirmation", async () => {
  preferences.reduced = false;
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const result = applyDebugEvent(freshState(new Date("2026-10-24T18:00:00Z")), "overtake", "a");
  const baselines = Object.fromEntries(Object.entries(result.baselines).map(([key, value]) => [momentStorageKey(key), value]));
  const moment = competitionMoments(result.state, "a", key => baselines[key])[0];
  const done = vi.fn();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(createElement(CompetitionMoment, { moment, remaining: 2, onConfirm: done })); });
    const root = renderer.root.findAllByType("View" as never).find(view => view.props.onLayout)!;
    await act(async () => root.props.onLayout({ nativeEvent: { layout: { height: 844 } } }));
    const button = renderer.root.findByType("FocusButton" as never);
    const field = () => renderer.root.findByType("LaneTrack" as never);
    expect(field().props.lanes.find((lane: { you?: boolean }) => lane.you).values[2]).toBe(moment.plan.youBefore);
    expect(button.props.label).toBe("Skip animation");
    await act(async () => button.props.onPress());
    expect(field().props.lanes.find((lane: { you?: boolean }) => lane.you).values[2]).toBe(moment.plan.youAfter);
    expect(button.props.label).toBe("Continue →");
    expect(done).not.toHaveBeenCalled();
    await act(async () => { button.props.onPress(); button.props.onPress(); });
    expect(done).toHaveBeenCalledTimes(1);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    preferences.reduced = true;
    vi.unstubAllGlobals();
  }
});
