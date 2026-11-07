vi.mock("../features/use-competition-course", () => ({ useCompetitionCourse: () => ({ course: null, error: "" }) }));
vi.mock("../lib/env", () => ({ mobileEnv: { mapboxAccessToken: "" } }));
vi.mock("./compete-sheet", () => ({ CompeteSheet: "CompeteSheet" }));
vi.mock("../lib/athlete-blocks", () => ({ useAthleteBlocks: () => ({ blocks: [], ready: true, setBlocked: vi.fn() }) }));
vi.mock("../features/athlete-profile-sheet", () => ({ AthleteProfileSheet: "AthleteProfileSheet" }));
vi.mock("./app-icon", () => ({ AppIcon: "AppIcon" }));
vi.mock("./club-art",()=>({alpineTrail:1}));
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  freshState,
  reduceCompete,
  type CompeteState,
} from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({
  state: null as CompeteState | null,
  mounts: 0,
  dispatch: vi.fn(),
  reducedMotion: true,
  baselines: new Map<string, string>(),
  readBaseline: (key: string): string | null => mock.baselines.get(key) ?? null,
  writeBaseline: (key: string, value: string) => {
    mock.baselines.set(key, value);
  },
}));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  function View({ children, ...props }: { children?: unknown }) {
    const inspect = (node: unknown): void => {
      if (Array.isArray(node)) node.forEach(inspect);
      else if (typeof node === "string" || typeof node === "number")
        throw Error("Bare text in native View");
    };
    inspect(children);
    return createElement("View", props, children as never);
  }
  return {
    StyleSheet: { create: (styles: unknown) => styles },
    View,
    Image: "Image",
    Modal: "Modal",
    Animated: { View: "View", Value: class { constructor(public value: number) {} interpolate(config: unknown) { return config; } }, timing: () => ({ start() {}, stop() {} }), createAnimatedComponent: () => "AnimatedGroup" },
    Easing: { out: (fn: unknown) => fn, cubic: (x: number) => x },
    AppState: { addEventListener: () => ({ remove() {} }) },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    Pressable: "Pressable",
    ScrollView: "ScrollView",
    Switch: "Switch",
    Text: "Text",
  };
});
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: "SafeAreaProvider",
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
vi.mock("expo-router", () => ({
  usePathname: () => "/arena",
  useGlobalSearchParams:()=>({}),
  useRouter: () => ({ navigate: vi.fn() }),
}));
vi.mock("../lib/auth", () => ({
  useAuth: () => ({ user: { id: "audit" }, offlineMode: true }),
}));
vi.mock("../lib/compete-store", () => ({
  useCompeteStore: () => ({
    state: mock.state,
    dispatch: mock.dispatch,
    accountKey: "audit",
    readBaselineItem: mock.readBaseline,
    writeBaselineItem: mock.writeBaseline,
  }),
}));
vi.mock("../lib/haptics", () => ({ playCue: vi.fn() }));
vi.mock("../lib/score-track-lens", () => ({
  useScoreTrackLens: () => ["open", vi.fn()],
}));
vi.mock("../features/crew", () => ({ useCrewApi: () => ({ live: false }) }));
vi.mock("../features/competition-summary", async () => {
  const { createElement } = await import("react");
  return {
    CompetitionSummary: ({ children, onRegister }: { children?: unknown; onRegister?: () => void }) =>
      createElement(
        "View",
        null,
        onRegister
          ? createElement("Pressable", {
              accessibilityRole: "button",
              accessibilityLabel: "Register for an event",
              onPress: onRegister,
            })
          : null,
        children as never,
      ),
  };
});
vi.mock("../features/sleep-panel", () => ({ SleepPanel: () => null }));
vi.mock("../features/round-takeover", () => ({ RoundTakeover: () => null }));
vi.mock("../features/geographic-course", () => ({ GeographicCourse: "GeographicCourse" }));
vi.mock("../features/use-competition-course", () => ({ useCompetitionCourse: () => ({ course: null, error: "", retry() {} }) }));
vi.mock("../features/competition-replay", () => ({
  CompetitionReplayButton: "CompetitionReplayButton", CompetitionReplayModal: "ReplayModal",
}));
vi.mock("./icon-button", () => ({ IconButton: "IconButton" }));
vi.mock("./arena-3d", () => ({ Arena3D: () => null }));
vi.mock("./portrait-field", () => ({ PortraitField: "PortraitField" }));
vi.mock("./award-shelf", () => ({ AwardShelf: () => null }));
vi.mock("react-native-svg", () => ({ default: "Svg", G: "SvgG" }));
vi.mock("./polished-racer", () => ({ PolishedRacer: "PolishedRacer" }));
vi.mock("./field-view-switcher", () => ({ FieldViewSwitcher: "FieldViewSwitcher" }));
vi.mock("./zoom-control", () => ({ ZoomControl: "ZoomControl" }));
vi.mock("./use-reduced-motion", () => ({
  useReducedMotion: () => mock.reducedMotion,
}));
vi.mock("./focus", async () => {
  const { createElement } = await import("react");
  return {
    FocusButton: "FocusButton",
    FocusSegments: ({ options, onChange }: { options: readonly { value: string; label: string }[]; onChange: (v: string) => void }) =>
      createElement(
        "View",
        null,
        options.map((opt) =>
          createElement("Pressable", {
            key: opt.value,
            accessibilityRole: "tab",
            accessibilityLabel: opt.label,
            onPress: () => onChange(opt.value),
          }),
        ),
      ),
    FocusTextButton: "TextButton",
    FocusDisclosure: "Disclosure",
    FocusSheet: "Sheet",
    f: {},
  };
});
vi.mock("./lane-track", async () => {
  const { createElement, useEffect } = await import("react");
  return {
    LaneTrack: (props: object) => {
      useEffect(() => {
        mock.mounts++;
      }, []);
      return createElement("LaneTrack", props);
    },
  };
});
vi.mock("./field-course", async () => {
  const { createElement, useState } = await import("react");
  return {
    useFieldAppearance: () => useState({ ground: "trail", edges: "club" }),
    FieldGroundPicker: (props: object) => createElement("FieldGroundPicker", props),
    FieldOverview: (props: object) => createElement("FieldOverview", props),
  };
});
import { CompeteExperienceProvider } from "../features/compete-experience";
import { ArenaScreen } from "../../app/(tabs)/arena";
let renderer: ReactTestRenderer;
async function layoutCarousel() {
 const host=renderer.root.findAllByType("View" as never).find(node=>typeof node.props.onLayout==="function");
 if(host)await act(async()=>host.props.onLayout({nativeEvent:{layout:{width:346}}}));
}
async function showDistanceLanes() {
  const switcher = renderer.root.findByType("FieldViewSwitcher" as never);
  expect(switcher.props.value).toBe("4d");
  await act(async () => switcher.props.onChange("2d"));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-22T16:00:00Z"));
});

afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
  vi.useRealTimers();
  mock.baselines.clear();
  mock.reducedMotion = true;
});
it("offers event management on the home base and only enters a field on explicit selection", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.state = reduceCompete(reduceCompete(freshState(), { type: "opt-in", sport: "running", now: "2026-10-19T09:00:00Z" }), { type: "opt-in", sport: "cycling", now: "2026-10-19T09:00:00Z" });
  const enter = vi.fn();
  await act(async () => { renderer = create(createElement(CompeteExperienceProvider, { value: { immersive: false, event: null, enter, close() {} }, children: createElement(ArenaScreen) })); });
  expect(renderer.root.findAllByType("LaneTrack" as never)).toHaveLength(0);
  expect(renderer.root.findAllByType("FieldViewSwitcher" as never)).toHaveLength(0);
  const running = renderer.root.findAllByType("Pressable" as never).find(node => node.props.accessibilityLabel === "Enter Running field")!;
  const cycling = renderer.root.findAllByType("Pressable" as never).find(node => node.props.accessibilityLabel === "Enter Cycling field")!;
  expect(running).toBeDefined(); expect(cycling).toBeDefined();
  expect(enter).not.toHaveBeenCalled();
  await act(async () => cycling.props.onPress());
  expect(enter).toHaveBeenCalledWith("audit", "cycling");
});

it("opens registration from the event home without entering a field", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.state = freshState();
  await act(async () => { renderer = create(createElement(ArenaScreen)); });
  const register = renderer.root.findAllByType("FocusButton" as never).find(node => node.props.label === "+ Register")!;
  await act(async () => register.props.onPress());
  expect(renderer.root.findAllByType("Sheet" as never).some(node => node.props.title === "Choose an event to join" && node.props.open)).toBe(true);
  expect(renderer.root.findAllByType("LaneTrack" as never)).toHaveLength(0);
});

it("keeps queued event previews honest and offers Recovery on the home", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.state = reduceCompete(freshState(), { type: "opt-in", sport: "running", now: new Date().toISOString() });
  await act(async () => { renderer = create(createElement(ArenaScreen)); });
  expect(JSON.stringify(renderer.toJSON())).toContain("Upcoming wave");
  expect(JSON.stringify(renderer.toJSON())).not.toContain("ahead of");
  expect(JSON.stringify(renderer.toJSON())).not.toContain("Place 1");
});
