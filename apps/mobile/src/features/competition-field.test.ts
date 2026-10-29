vi.mock("../lib/athlete-blocks", () => ({ useAthleteBlocks: () => ({ blocks: [], ready: true, setBlocked: vi.fn() }) }));
vi.mock("./athlete-profile-sheet", () => ({ AthleteProfileSheet: "AthleteProfileSheet" }));
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { defaultFieldAppearance, freshState, reduceCompete, DEMO_RACE_COURSE } from "@fitness-battle/shared";
const mocks = vi.hoisted(() => ({ fly: vi.fn(), appState: null as null | ((status: string) => void) }));
vi.mock("expo-router", () => ({ usePathname: () => "/arena" }));
vi.mock("react-native", () => ({
  Modal: "Modal",
  Animated: { View: "View", Value: class { constructor(public value: number) {} interpolate(config: unknown) { return config; } }, timing: () => ({ start() {}, stop() {} }), createAnimatedComponent: () => "AnimatedGroup" },
  Easing: { out: (fn: unknown) => fn, cubic: (x: number) => x }, Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View",
  StyleSheet: { create: (v: unknown) => v },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
  AppState: { addEventListener: (_name: string, fn: (status: string) => void) => { mocks.appState = fn; return { remove() { mocks.appState = null; } }; } },
}));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34 }) }));
vi.mock("react-native-svg", () => ({ default: "Svg", G: "SvgG" }));
vi.mock("./geographic-course", () => ({ GeographicCourse: "GeographicCourse" }));
vi.mock("./use-competition-course", () => ({ useCompetitionCourse: () => ({ course: DEMO_RACE_COURSE, error: "", retry() {} }) }));
vi.mock("./competition-replay", () => ({ CompetitionReplayButton: "ReplayButton" }));
vi.mock("../ui/field-view-switcher", () => ({
  FieldViewSwitcher: ({ value, onChange }: { value: string; onChange: (v: string) => void }) =>
    createElement("FieldViewSwitcher", { value, onChange }),
}));
vi.mock("../ui/field-ground-switcher", () => ({ FieldGroundSwitcher: "FieldGroundSwitcher" }));
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
vi.mock("../ui/focus", () => ({ f: {}, useFocusStyles: () => ({}) }));
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
  await act(async () => button("Collapse current positions").props.onPress());
  expect(button("Expand current positions").props.accessibilityState.expanded).toBe(false);
  expect(button("Collapse athlete panel").props.accessibilityState.expanded).toBe(true);
  await act(async () => button("Collapse athlete panel").props.onPress());
  expect(button("Expand athlete panel").props.accessibilityState.expanded).toBe(false);
  await act(async () => button("Expand current positions").props.onPress());
  expect(button("Collapse current positions").props.accessibilityState.expanded).toBe(true);
  expect(button("Zoom in")).toBeUndefined();
  const replay = renderer.root.findAllByType("ReplayButton" as never)[0].parent!;
  const stopPropagation = vi.fn();
  replay.props.onTouchStart({ stopPropagation });
  expect(stopPropagation).toHaveBeenCalledTimes(1);
});

it("keeps 4D inside the fullscreen host with the same panels, selection and replay", async () => {
  const switchTo = async (mode: string) => act(async () => {
    const switcher = renderer.root.findAllByType("FieldViewSwitcher" as never)[0];
    switcher.props.onChange(mode.toLowerCase());
  });
  await switchTo("4D");
  const map = () => renderer.root.findByType("GeographicCourse" as never);
  const course = DEMO_RACE_COURSE;
  expect(map().props.course).toBe(course);
  expect(map().props.onCourseChange).toBeUndefined();
  const overview = () => renderer.root.findByType("FieldOverview" as never);
  expect(overview().props.positionOnly).toBe(true);
  const selected = map().props.selectedId;
  const fieldCenter = field().props.view.center;
  await act(async () => overview().props.onNavigate(.75));
  expect(map().props.distanceTarget).toMatchObject({ value: .75, request: 1 });
  expect(overview().props.view.center).toBe(.75);
  expect(map().props.selectedId).toBe(selected);
  expect(field().props.view.center).toBe(fieldCenter);
  await act(async () => map().props.onResumeFollow());
  expect(map().props.distanceTarget).toBeNull();
  expect(renderer.root.findAllByType("Modal" as never)).toHaveLength(1);
  expect(button("Collapse current positions")).toBeDefined();
  await act(async () => button("Collapse athlete panel").props.onPress());
  expect(button("Expand athlete panel")).toBeDefined();
  expect(overview()).toBeDefined();
  await act(async () => overview().props.onNavigate(.5));
  const peer = map().props.lanes.find((lane: { you: boolean }) => !lane.you);
  if (peer) {
    await act(async () => map().props.onSelect(peer.id));
    expect(map().props.selectedId).toBe(peer.id);
    expect(map().props.distanceTarget).toBeNull();
    expect(overview().props.view.center).toBe(peer.value);
  }
  expect(mocks.fly).not.toHaveBeenCalled();
  const replay = renderer.root.findAllByType("ReplayButton" as never).find(node => node.props.dimension === "4d")!;
  expect(replay.props.course).toBeUndefined();
  await act(async () => { root().props.onTouchStartCapture(); scene().props.onTouchStart(touch()); vi.advanceTimersByTime(450); });
  expect(map().props.overlaysHidden).toBe(true);
  await act(async () => scene().props.onTouchEnd());
  await switchTo("2D");
  expect(renderer.root.findAllByType("FieldOverview" as never)).toHaveLength(1);
  expect(renderer.root.findAllByType("GeographicCourse" as never)).toHaveLength(0);
  await switchTo("4D");
  expect(overview().props.positionOnly).toBe(true);
  expect(map().props.course).toBe(course);
  expect(button("Expand athlete panel")).toBeDefined();
});

it("keeps a navigable overview inside the athlete panel across collapse and expansion", async () => {
  const overview = () => renderer.root.findByType("FieldOverview" as never);
  expect(overview()).toBeDefined();
  await act(async () => overview().props.onNavigate(5));
  expect(field().props.view.center).toBe(5);
  await act(async () => button("Collapse athlete panel").props.onPress());
  expect(overview()).toBeDefined();
  const switcher = renderer.root.findAllByType("FieldViewSwitcher" as never)[0];
  await act(async () => switcher.props.onChange("3d"));
  expect(overview()).toBeDefined();
  await act(async () => overview().props.onNavigate(3));
  expect(renderer.root.findByType("PortraitField" as never).props.view.center).toBe(3);
  await act(async () => button("Expand athlete panel").props.onPress());
  expect(overview()).toBeDefined();
});
it("opens an athlete profile from the fullscreen standings without changing the field", async () => {
  const entry = renderer.root.findAllByType("Pressable" as never).find(node => String(node.props.accessibilityLabel).startsWith("View ") && String(node.props.accessibilityLabel).endsWith("'s profile"))!;
  expect(entry).toBeDefined();
  await act(async () => entry.props.onPress());
  const sheet = renderer.root.findByType("AthleteProfileSheet" as never);
  expect(sheet.props.athlete.name).toBeTruthy();
  expect(field().props.lanes.length).toBeGreaterThan(0);
});
