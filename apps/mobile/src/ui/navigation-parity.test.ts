vi.mock("../lib/haptics", () => ({ playCue: vi.fn(), playPattern: vi.fn(() => vi.fn()) }));
vi.mock("./app-icon", () => ({ AppIcon: "AppIcon" }));
vi.mock("./club-art",()=>({clubIcon:1}));
import { freshState, type CompeteState } from "@fitness-battle/shared";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  state: null as CompeteState | null,
  params: {} as Record<string, string | undefined>,
  navigate: vi.fn(),
  push: vi.fn(),
  setParams: vi.fn(),
}));
vi.mock("react-native", () => ({useColorScheme: () => "light",
  Animated: { createAnimatedComponent: (c: unknown) => c },
  StyleSheet: { create: (styles: unknown) => styles },
  Image: "Image",
  Platform:{OS:"ios"},
  Pressable: "Pressable",
  Text: "Text",
  View: "View",
}));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));
vi.mock("expo-router", async () => ({
  useFocusEffect: (await import("react")).useEffect,
  useLocalSearchParams: () => mock.params,
  usePathname: () => "/today",
  useRouter: () => ({
    navigate: mock.navigate,
    push: mock.push,
    setParams: mock.setParams,
  }),
}));
vi.mock("../lib/compete-store", () => ({
  useCompeteStore: () => ({ state: mock.state }),
}));
vi.mock("../features/progress-screen", () => ({
  ProgressScreen: "ProgressScreen",
}));
vi.mock("../features/vitals-lab/vitals-lab-canvas-prefetch", () => ({
  VitalsLabCanvasPrefetch: "VitalsLabCanvasPrefetch",
}));
vi.mock("react-native-svg", () => ({ default: "Svg", Path: "Path", Circle: "Circle", Defs: "Defs", RadialGradient: "RadialGradient", Stop: "Stop" }));
vi.mock("../features/effort-rail",()=>({EffortRail:"EffortRail"}));
import ProgressTab from "../../app/(tabs)/you";
import { AppHeader } from "./app-header";
let renderer: ReactTestRenderer;
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
  mock.params = {};
  mock.state = null;
  vi.clearAllMocks();
});
describe("mobile navigation parity", () => {
  it("opens Progress from the existing you tab and Athlete from the header", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    await act(async () => {
      renderer = create(createElement(ProgressTab));
    });
    expect(renderer.root.findByType("ProgressScreen" as never)).toBeTruthy();
    await act(async () => {
      renderer.update(createElement(AppHeader));
    });
    const profile = renderer.root
      .findAllByType("Pressable" as never)
      .find(
        (node) => node.props.accessibilityLabel === "Open athlete settings",
      )!;
    await act(async () => profile.props.onPress());
    expect(mock.navigate).toHaveBeenCalledWith("/athlete");
  });
  it.each([
    { panel: "preferences" },
    { tracker: "connected", provider: "strava" },
  ])("preserves legacy settings and tracker links %s", async (params) => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mock.params = params;
    await act(async () => {
      renderer = create(createElement(ProgressTab));
    });
    expect(mock.setParams).toHaveBeenCalledWith({
      panel: undefined,
      tracker: undefined,
      provider: undefined,
    });
    expect(mock.push).toHaveBeenCalledWith({
      pathname: "/athlete",
      params: {
        panel: undefined,
        tracker: undefined,
        provider: undefined,
        ...params,
      },
    });
    mock.params = {};
    await act(async () => renderer.update(createElement(ProgressTab)));
    expect(renderer.root.findByType("ProgressScreen" as never)).toBeTruthy();
    expect(mock.push).toHaveBeenCalledTimes(1);
  });
});

 it("groups the profile, effort and streak as separate accessible controls before Debug", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const state = freshState();
  state.avatarUrl = "https://example.com/athlete.jpg";
  mock.state = state;
  await act(async () => { renderer = create(createElement(AppHeader)); });
  const group = renderer.root.findByProps({ testID: "athlete-header-group" });
  expect(group.findAllByType("Pressable" as never)).toHaveLength(1);
  expect(group.findByType("EffortRail" as never).props.compact).toBe(true);
  expect(group.findAllByType("AppIcon" as never).some(node => node.props.name === "flame")).toBe(true);
  expect(group.findAllByType("Image" as never).some(node => node.props.source?.uri === state.avatarUrl)).toBe(true);
  expect(group.findAllByProps({ accessibilityLabel: "Debug event triggers" })).toHaveLength(0);
  const buttons = renderer.root.findAllByType("Pressable" as never);
  expect(buttons[0]!.props.accessibilityLabel).toBe("Open athlete settings");
  expect(buttons[1]!.props.accessibilityLabel).toBe("Debug event triggers");
  await act(async () => buttons[0]!.props.onPress());
  expect(mock.navigate).toHaveBeenCalledWith("/athlete");
 });

it("lights the weekly streak fire when counted activity exists earlier in the same week", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-05T17:00:00Z"));
  const state = freshState(new Date("2026-11-05T17:00:00Z"));
  state.activities = [{ id: "mon", sport: "strength", startedAt: "2026-11-03T15:00:00Z", movingSec: 2400, distanceM: 0, avgHr: null, verified: false, source: "manual", provenance: "manual", disposition: "counted" }];
  mock.state = state;
  await act(async () => { renderer = create(createElement(AppHeader)); });
  const streak = renderer.root.findByProps({ accessibilityLabel: "1 week activity streak" });
  expect(streak.findByType("AppIcon" as never).props.name).toBe("flameFilled");
  vi.useRealTimers();
});

it("hides native debug controls in release builds", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("__DEV__", false);
  await act(async () => { renderer = create(createElement(AppHeader)); });
  expect(renderer.root.findAllByProps({ accessibilityLabel: "Debug event triggers" })).toHaveLength(0);
  expect(renderer.root.findAllByProps({ accessibilityLabel: "Trigger UI events" })).toHaveLength(0);
});
