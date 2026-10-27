import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { defaultFieldAppearance, freshState, reduceCompete } from "@fitness-battle/shared";
const mocks = vi.hoisted(() => ({ fly: vi.fn(), appState: null as null | ((status: string) => void) }));
vi.mock("expo-router", () => ({ usePathname: () => "/arena" }));
vi.mock("react-native", () => ({
  Modal: "Modal",
  Animated: { View: "View", Value: class { constructor(public value: number) {} interpolate(config: unknown) { return config; } }, timing: () => ({ start() {}, stop() {} }), createAnimatedComponent: () => "AnimatedGroup" },
  Easing: { out: (fn: unknown) => fn, cubic: (x: number) => x }, Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View",
  useWindowDimensions: () => ({ width: 390, height: 844 }),
  AppState: { addEventListener: (_name: string, fn: (status: string) => void) => { mocks.appState = fn; return { remove() { mocks.appState = null; } }; } },
}));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34 }) }));
vi.mock("react-native-svg", () => ({ default: "Svg", G: "SvgG" }));
vi.mock("./competition-replay", () => ({ CompetitionReplayButton: "ReplayButton" }));
vi.mock("../ui/user-avatar", () => ({ UserAvatar: "UserAvatar" }));
vi.mock("../ui/section", () => ({ textStyle: () => ({}) }));
vi.mock("../ui/rank-badge", () => ({ RankBadge: "RankBadge" }));
vi.mock("../ui/use-field-flight", () => ({ useFieldFlight: () => ({ cancel() {}, fly: mocks.fly }) }));
vi.mock("../ui/portrait-field", () => ({ PortraitField: "PortraitField" }));
vi.mock("../ui/lane-track", () => ({ LaneTrack: "LaneTrack" }));
vi.mock("../ui/icon-button", () => ({ IconButton: "IconButton" }));
vi.mock("../ui/polished-racer", () => ({ PolishedRacer: "PolishedRacer" }));
vi.mock("../ui/use-reduced-motion", () => ({ useReducedMotion: () => true }));
vi.mock("../ui/field-course", () => ({ FieldOverview: "FieldOverview", useFieldAppearance: () => [defaultFieldAppearance, vi.fn()] }));
vi.mock("../ui/focus", () => ({ f: {} }));
vi.mock("../lib/haptics", () => ({ playCue() {} }));
vi.mock("../lib/compete-store", () => ({ useCompeteStore: () => ({ state: reduceCompete(freshState(new Date("2026-10-26T18:00:00Z")), { type: "opt-in", sport: "running" }), accountKey: "test" }) }));
import { CompetitionField } from "./competition-field";
let renderer: ReactTestRenderer;
const field = () => renderer.root.findByType("LaneTrack" as never);
const scene = () => renderer.root.findAllByType("View" as never).find(node => node.props.onTouchStart && node.props.onTouchEnd)!;
const root = () => renderer.root.findAllByType("View" as never).find(node => node.props.onTouchStartCapture)!;
const button = (label: string) => renderer.root.findAllByType("Pressable" as never).find(node => node.props.accessibilityLabel === label)!;
const touch = (x = 10) => ({ nativeEvent: { pageX: x, pageY: 20, touches: [{}] } });
beforeEach(async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-26T18:00:00Z")); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); mocks.fly.mockClear();
  await act(async () => { renderer = create(createElement(CompetitionField, { sport: "running", track: "verified" })); });
  await act(async () => field().props.onExpand());
});
afterEach(async () => { await act(async () => renderer.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it("restores HUD and consumes a held athlete release without blocking the next gesture", async () => {
  await act(async () => { root().props.onTouchStartCapture(); scene().props.onTouchStart(touch()); vi.advanceTimersByTime(450); });
  expect(field().props.overlaysHidden).toBe(true);
  await act(async () => scene().props.onTouchEnd());
  expect(field().props.overlaysHidden).toBe(false);
  vi.advanceTimersByTime(500);
  await act(async () => field().props.onSelect(field().props.lanes[0]));
  expect(mocks.fly).not.toHaveBeenCalled();
  await act(async () => { root().props.onTouchStartCapture(); scene().props.onTouchStart(touch()); scene().props.onTouchEnd(); });
  await act(async () => field().props.onSelect(field().props.lanes[0]));
  expect(mocks.fly).toHaveBeenCalledTimes(1);
});
it("cancels a pending hold for small drags and app backgrounding", async () => {
  await act(async () => { scene().props.onTouchStart(touch()); scene().props.onTouchMove(touch(14)); vi.advanceTimersByTime(500); });
  expect(field().props.overlaysHidden).toBe(false);
  await act(async () => { scene().props.onTouchStart(touch()); vi.advanceTimersByTime(450); });
  expect(field().props.overlaysHidden).toBe(true);
  await act(async () => mocks.appState?.("inactive"));
  expect(field().props.overlaysHidden).toBe(false);
});
it("collapses each panel independently and isolates zoom/replay touches from scene holds", async () => {
  await act(async () => button("Collapse live intervals").props.onPress());
  expect(button("Expand live intervals").props.accessibilityState.expanded).toBe(false);
  expect(button("Collapse athlete panel").props.accessibilityState.expanded).toBe(true);
  await act(async () => button("Collapse athlete panel").props.onPress());
  expect(button("Expand athlete panel").props.accessibilityState.expanded).toBe(false);
  await act(async () => button("Expand live intervals").props.onPress());
  expect(button("Collapse live intervals").props.accessibilityState.expanded).toBe(true);
  const zoom = button("Zoom in").parent!;
  const stopPropagation = vi.fn();
  zoom.props.onTouchStart({ stopPropagation });
  expect(stopPropagation).toHaveBeenCalledTimes(1);
});
