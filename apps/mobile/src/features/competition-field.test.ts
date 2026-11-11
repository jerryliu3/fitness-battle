vi.mock("react-native-reanimated", () => ({ default: { View: "AnimatedRow" }, LinearTransition: { duration: () => ({}) } }));
vi.mock("../ui/app-icon", () => ({ AppIcon: "AppIcon" }));
import { CompetitionTimelineProvider, CompetitionTimelineControls } from "./competition-timeline-context";
vi.mock("./competition-replay", () => ({ CompetitionReplayModal: "ReplayModal" }));
vi.mock("../lib/auth", () => ({ useAuth: () => ({ user: null, offlineMode: true }) }));
vi.mock("../lib/env", () => ({ mobileEnv: { apiUrl: "" } }));
vi.mock("../lib/api", () => ({ requestApi: vi.fn() }));
vi.mock("../lib/athlete-blocks", () => ({ useAthleteBlocks: () => ({ blocks: [], ready: true, setBlocked: vi.fn() }) }));
vi.mock("./athlete-profile-sheet", () => ({ AthleteProfileSheet: "AthleteProfileSheet" }));
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { competePeriodWindow, competeNow, defaultFieldAppearance, freshState, reduceCompete, DEMO_RACE_COURSE } from "@fitness-battle/shared";
const mocks = vi.hoisted(() => ({ fly: vi.fn(), path: "/arena", appState: null as null | ((status: string) => void) }));
vi.mock("expo-router", () => ({ usePathname: () => mocks.path }));
vi.mock("react-native", () => ({useColorScheme: () => "light",
  Modal: "Modal", PanResponder: { create: () => ({ panHandlers: {} }) },
  Animated: { View: "View", Value: class { constructor(public value: number) {} interpolate(config: unknown) { return config; } }, timing: () => ({ start() {}, stop() {} }), createAnimatedComponent: () => "AnimatedGroup" },
  Easing: { out: (fn: unknown) => fn, cubic: (x: number) => x }, Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View",
  StyleSheet: { create: (v: unknown) => v },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
  AppState: { addEventListener: (_name: string, fn: (status: string) => void) => { mocks.appState = fn; return { remove() { mocks.appState = null; } }; } },
}));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 44, bottom: 34 }) }));
vi.mock("react-native-svg", () => ({ default: "Svg", G: "SvgG" }));
vi.mock("./queued-field", () => ({ QueuedField: "QueuedField" }));
vi.mock("./geographic-course", () => ({ GeographicCourse: "GeographicCourse" }));
vi.mock("./use-competition-course", () => ({ useCompetitionCourse: () => ({ course: DEMO_RACE_COURSE, error: "", retry() {} }) }));
vi.mock("../ui/field-view-switcher", () => ({
  FieldViewSwitcher: ({ value, onChange }: { value: string; onChange: (v: string) => void }) =>
    createElement("FieldViewSwitcher", { value, onChange }),
}));
vi.mock("../ui/field-ground-switcher", () => ({ FieldGroundSwitcher: "FieldGroundSwitcher" }));
vi.mock("../ui/user-avatar", () => ({ UserAvatar: "UserAvatar" }));
vi.mock("../ui/section", () => ({ AppText: "AppText", textStyle: () => ({}) }));
vi.mock("../ui/rank-badge", () => ({ RankBadge: "RankBadge" }));
vi.mock("../ui/use-field-flight", () => ({ useFieldFlight: () => ({ cancel() {}, fly: mocks.fly }) }));
vi.mock("../ui/portrait-field", () => ({ PortraitField: "PortraitField" }));
vi.mock("../ui/lane-track", () => ({ LaneTrack: "LaneTrack" }));
vi.mock("../ui/icon-button", () => ({ IconButton: "IconButton" }));
vi.mock("../ui/polished-racer", () => ({ PolishedRacer: "PolishedRacer" }));
vi.mock("../ui/use-reduced-motion", () => ({ useReducedMotion: () => true }));
vi.mock("../ui/field-course", () => ({ FieldOverview: "FieldOverview", useFieldAppearance: () => [defaultFieldAppearance, vi.fn()] }));
vi.mock("../ui/focus", () => ((()=>{const mock={ f: {} };return {...mock,useFocusStyles:()=>("f" in mock ? mock.f : {})};})()));
vi.mock("../lib/haptics", () => ({ playCue() {} }));
vi.mock("../lib/compete-store", () => ({ useCompeteStore: () => ({ state: fieldState, accountKey: "test" }) }));
const fieldState = reduceCompete(freshState(new Date("2026-10-26T18:00:00Z")), { type: "opt-in", sport: "running", now: "2026-10-26T09:00:00Z" });
fieldState.activities = [{ id: "counted-run", sport: "running", startedAt: "2026-10-26T16:00:00Z", distanceM: 1000, movingSec: 300, avgHr: null, verified: true, source: "strava" }];
import { CompetitionField } from "./competition-field";
let renderer: ReactTestRenderer;
const field = () => renderer.root.findByType("LaneTrack" as never);
const scene = () => renderer.root.findAllByType("View" as never).find(node => node.props.onTouchStart && node.props.onTouchEnd)!;
const root = () => renderer.root.findAllByType("View" as never).find(node => node.props.onTouchStartCapture)!;
const button = (label: string) => renderer.root.findAllByType("Pressable" as never).find(node => node.props.accessibilityLabel === label)!;
const touch = (x = 10) => ({ nativeEvent: { pageX: x, pageY: 20, touches: [{}] } });
beforeEach(async () => {
  mocks.path = "/arena";
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-26T18:00:00Z")); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); mocks.fly.mockClear();
  await act(async () => { renderer = create(createElement(CompetitionField, { sport: "running", track: "verified" })); });
  expect(renderer.root.findAllByType("FieldViewSwitcher" as never)[0].props.value).toBe("4d");
  await act(async () => renderer.root.findAllByType("FieldViewSwitcher" as never)[0].props.onChange("2d"));
  await act(async () => field().props.onExpand());
});
afterEach(async () => { await act(async () => renderer.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it("restores exit and current leaders in the immersive field while standings use the sheet", async () => {
  const onDetails = vi.fn();
  await act(async () => renderer.update(createElement(CompetitionField, { sport: "running", track: "verified", persistent: true, backgroundMode: true, onDetails })));
  expect(renderer.root.findAllByType("IconButton" as never).filter(node => node.props.label === "Back to events")).toHaveLength(1);
  expect(renderer.root.findAll(node => node.props.label === "current leaders").length).toBeGreaterThan(0);
  expect(renderer.root.findAll(node => node.props.label === "athlete panel")).toHaveLength(0);
  expect(renderer.root.findAllByType("Pressable" as never).some(node => node.props.accessibilityLabel === "Expand standings")).toBe(false);
  expect(field().props.fullscreen).toBe(true);
});
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
it("collapses each panel independently and isolates timeline touches from scene holds", async () => {
  await act(async () => button("Collapse current leaders").props.onPress());
  expect(button("Expand current leaders").props.accessibilityState.expanded).toBe(false);
  expect(button("Collapse athlete panel").props.accessibilityState.expanded).toBe(true);
  await act(async () => button("Collapse athlete panel").props.onPress());
  expect(button("Expand athlete panel").props.accessibilityState.expanded).toBe(false);
  await act(async () => button("Expand current leaders").props.onPress());
  expect(button("Collapse current leaders").props.accessibilityState.expanded).toBe(true);
  expect(button("Zoom in")).toBeUndefined();
  const replay = renderer.root.findAllByType("View" as never).find(node => node.props.onTouchStart && !node.props.onTouchEnd)!;
  const stopPropagation = vi.fn();
  replay.props.onTouchStart({ stopPropagation });
  expect(stopPropagation).toHaveBeenCalledTimes(1);
});

it("keeps 4D inside the fullscreen host with the same panels, selection and timeline", async () => {
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
  await act(async () => map().props.onSelect(map().props.selectedId));
  expect(map().props.distanceTarget).toBeNull();
  expect(renderer.root.findAllByType("Modal" as never)).toHaveLength(1);
  expect(button("Collapse current leaders")).toBeDefined();
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
  expect(renderer.root.findAllByProps({ accessibilityLabel: "Competition timeline" }).length).toBeGreaterThan(0);
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
it("focuses an athlete from current leaders without opening their profile", async () => {
  const entry = renderer.root.findAllByType("Pressable" as never).find(node => String(node.props.accessibilityLabel).startsWith("Focus "))!;
  expect(entry).toBeDefined();
  await act(async () => entry.props.onPress());
  const sheet = renderer.root.findByType("AthleteProfileSheet" as never);
  expect(sheet.props.athlete).toBeNull();
  expect(field().props.lanes.length).toBeGreaterThan(0);
});

it("expands the whole 3D preview and only exposes course options in full screen", async () => {
  const map = () => renderer.root.findByType("GeographicCourse" as never);
  const choose = async (value: string) => act(async () => renderer.root.findAllByType("FieldViewSwitcher" as never)[0].props.onChange(value));
  await choose("4d");
  const close = renderer.root.findAllByType("IconButton" as never).find(node => node.props.label === "Close full screen field")!;
  await act(async () => close.props.onPress());
  expect(map().props.optionsTop).toBeNull();
  expect(map().parent!.props.pointerEvents).toBe("none");
  expect(renderer.root.findAllByType("IconButton" as never).some(node => node.props.icon === "expand")).toBe(false);
  expect(renderer.root.findAllByType("Text" as never).some(node => node.props.children === "Tap to open full screen")).toBe(true);
  await act(async () => button("Open 3D course in full screen").props.onPress());
  expect(map().parent!.props.pointerEvents).toBe("auto");
  expect(map().props.optionsTop).toBe(50);
  expect(button("Open 3D course in full screen")).toBeUndefined();
});


it("omits Elo from the fullscreen athlete spotlight", () => {
  const labels = renderer.root.findAllByType("Text" as never).map(node => JSON.stringify(node.props.children));
  expect(labels.some(label => /ELO/i.test(label))).toBe(false);
});

it("retains the fullscreen scene across tab blur and exits without collapsing it", async () => {
  await act(async () => renderer.unmount());
  const onExit = vi.fn();
  const onDetails = vi.fn();
  const props = { sport: "running" as const, track: "verified" as const, persistent: true, onExit, onDetails };
  await act(async () => { renderer = create(createElement(CompetitionField, props)); });
  const map = renderer.root.findByType("GeographicCourse" as never);
  expect(map.props.cardSessionKey).toBe(true);
  expect(renderer.root.findAll(node => /^.+, place \d+,/.test(node.props.accessibilityLabel ?? ""))).toHaveLength(0);
  const details = renderer.root.findAllByType("Pressable" as never).find(node => node.props.accessibilityLabel === "Events & standings")!;
  await act(async () => details.props.onPress());
  expect(onDetails).toHaveBeenCalledOnce();
  expect(renderer.root.findAllByType("Modal" as never)).toHaveLength(0);
  mocks.path = "/today";
  await act(async () => renderer.update(createElement(CompetitionField, props)));
  expect(renderer.root.findByType("GeographicCourse" as never)).toBe(map);
  expect(map.props.cardSessionKey).toBe(true);
  mocks.path = "/arena";
  await act(async () => renderer.update(createElement(CompetitionField, props)));
  const exit = renderer.root.findAllByType("IconButton" as never).find(node => node.props.label === "Close full screen field")!;
  await act(async () => exit.props.onPress());
  expect(onExit).toHaveBeenCalledOnce();
  expect(renderer.root.findByType("GeographicCourse" as never)).toBe(map);
});

it("scrubs the current field and preserves its cursor across dimensions and fullscreen", async () => {
  const liveValues = field().props.lanes.filter((lane: { ghost?: boolean }) => !lane.ghost).map((lane: { values: number[] }) => lane.values[2]);
  const timeline = () => renderer.root.findAllByProps({ accessibilityLabel: "Competition timeline" })[0];
  expect(timeline().props.accessibilityValue.max).toBeGreaterThan(0);
  await act(async () => timeline().props.onAccessibilityAction({ nativeEvent: { actionName: "decrement" } }));
  const at = timeline().props.accessibilityValue.now;
  expect(at).toBeLessThan(timeline().props.accessibilityValue.max);
  await act(async () => renderer.root.findAllByType("FieldViewSwitcher" as never)[0].props.onChange("4d"));
  expect(timeline().props.accessibilityValue.now).toBe(at);
  await act(async () => renderer.root.findByType("IconButton" as never).props.onPress());
  expect(timeline().props.accessibilityValue.now).toBe(at);
  await act(async () => button("Latest").props.onPress());
  const map = renderer.root.findByType("GeographicCourse" as never);
  expect(map.props.lanes.map((lane: { value: number }) => lane.value)).toEqual(liveValues);
});

it("leaves the redesigned immersive sheet free of the legacy timeline and keeps its replay action", async () => {
  await act(async () => renderer.unmount());
  await act(async () => { renderer = create(createElement(CompetitionField, { sport: "running", track: "verified", persistent: true, backgroundMode: true })); });
  expect(renderer.root.findAllByProps({ accessibilityLabel: "Competition timeline" })).toHaveLength(0);
  const map = renderer.root.findByType("GeographicCourse" as never);
  await act(async () => map.props.onReplay());
  expect(renderer.root.findByType("ReplayModal" as never).props.open).toBe(true);
  await act(async () => renderer.root.findByType("ReplayModal" as never).props.onClose());
  expect(renderer.root.findByType("ReplayModal" as never).props.open).toBe(false);
});

it("shares historical positions between the retained map and standings and bounds the vertical course rail", async () => {
  await act(async () => renderer.unmount());
  const period = competePeriodWindow(fieldState, competeNow(fieldState), "running");
  await act(async () => { renderer = create(createElement(CompetitionTimelineProvider, {
    state: fieldState, selection: { sport: "running", track: "verified", periodStart: period.startsAt.toISOString(), periodEnd: period.endsAt.toISOString() }, enabled: true, active: true,
    children: createElement("View", null,
      createElement(CompetitionField, { sport: "running", track: "verified", persistent: true, backgroundMode: true }),
      createElement(CompetitionTimelineControls),
      createElement(CompetitionField, { sport: "running", track: "verified", standingsOnly: true })),
  })); });
  const timeline = () => renderer.root.findAllByProps({ accessibilityLabel: "Competition timeline" })[0];
  expect(timeline().props.accessibilityValue.max).toBeGreaterThan(0);
  await act(async () => timeline().props.onAccessibilityAction({ nativeEvent: { actionName: "decrement" } }));
  const map = renderer.root.findByType("GeographicCourse" as never);
  expect(map.props.lanes.every((lane: { value: number }) => lane.value === 0)).toBe(true);
  expect(renderer.root.findByProps({ accessibilityLabel: "Course position" }).props.accessibilityValue.max).toBe(0);
  const rows = renderer.root.findAllByType("Pressable" as never).filter(node => /^.+, place \d+,/.test(node.props.accessibilityLabel ?? ""));
  expect(rows[0].props.accessibilityLabel).toContain("0.00");
  await act(async () => timeline().props.onAccessibilityAction({ nativeEvent: { actionName: "increment" } }));
  expect(map.props.lanes.some((lane: { value: number }) => lane.value > 0)).toBe(true);
});
