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
  CompetitionReplayButton: "CompetitionReplayButton",
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
import ArenaScreen from "../../app/(tabs)/arena";
let renderer: ReactTestRenderer;
async function layoutCarousel() {
 const host=renderer.root.findAllByType("View" as never).find(node=>typeof node.props.onLayout==="function");
 if(host)await act(async()=>host.props.onLayout({nativeEvent:{layout:{width:346}}}));
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
describe("native competition interactions", () => {
  it("renders registration without bare error text and retains the lane instance across standings", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mock.mounts = 0;
    mock.state = reduceCompete(freshState(), {
      type: "opt-in",
      sport: "running",
    });
    await act(async () => {
      renderer = create(createElement(ArenaScreen));
    });
    await layoutCarousel();
    const lane = () => renderer.root.findByType("LaneTrack" as never);
    const switcher = () => renderer.root.findByType("FieldViewSwitcher" as never);
    expect(mock.mounts).toBe(1);
    const rival = lane().props.lanes.find(
      (item: { you: boolean; ghost: boolean }) => !item.you && !item.ghost,
    );
    await act(async () => lane().props.onSelect(rival));
    expect(lane().props.view.center).toBe(rival.values[2]);
    expect(JSON.stringify(renderer.toJSON())).not.toContain("athlete details");
    expect(JSON.stringify(renderer.toJSON())).not.toContain(" · Place ");
    expect(switcher().props.value).toBe("2d");
    expect(mock.mounts).toBe(1);
    const register = renderer.root.findAllByType("Pressable" as never).find((node) => node.props.accessibilityLabel === "Register for an event")!;
    await act(async () => register.props.onPress());
    const registrationOpen = () => renderer.root.findAllByType("Sheet" as never).some(node=>node.props.title==="Choose an event to join"&&node.props.open);
    expect(registrationOpen()).toBe(true);
  });

  it("leaves event replay to the root experience and shows settled field values", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    mock.reducedMotion = false;
    mock.state = reduceCompete(freshState(), {
      type: "opt-in",
      sport: "running",
    });
    await act(async () => {
      renderer = create(createElement(ArenaScreen));
    });
    await layoutCarousel();
    mock.state = reduceCompete(mock.state, {
      type: "log-manual",
      activityId: "review-run",
      now: "2026-10-22T15:59:00Z",
      sport: "running",
      distanceM: 1609.344,
      movingSec: 600,
    });
    // Running now uses GPS Tracked; animate a recorded GPS session, not manual Open volume.
    mock.state = { ...mock.state, activities: mock.state.activities.map(activity =>
      activity.id === "review-run" ? { ...activity, source: "strava", provenance: "recorded", verified: true } : activity) };
    await act(async () => renderer.update(createElement(ArenaScreen)));
    await layoutCarousel();
    const lane = renderer.root.findByType("LaneTrack" as never);
    expect(lane.props.overtakeFrame).toBeUndefined();
    expect(lane.props.lanes.find((item: { you: boolean }) => item.you).values[2]).toBeGreaterThan(0);

  });


});

it("mounts only one registered sport and replaces it when switching",async()=>{
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
 mock.dispatch.mockClear();
 mock.state=reduceCompete(reduceCompete(freshState(),{type:"opt-in",sport:"running"}),{type:"opt-in",sport:"cycling"});
 await act(async()=>{renderer=create(createElement(ArenaScreen));});
 await layoutCarousel();
 expect(renderer.root.findAllByType("LaneTrack" as never)).toHaveLength(1);
 const choice=renderer.root.findAllByType("Pressable" as never).find(n=>n.props.accessibilityRole==="tab"&&n.props.accessibilityLabel==="Cycling")!;
 await act(async()=>choice.props.onPress());
 expect(renderer.root.findAllByType("LaneTrack" as never)).toHaveLength(1);
 expect(renderer.root.findAllByType("FieldViewSwitcher" as never).length).toBeGreaterThan(0);
 expect(mock.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({type:"set-primary"}));
 mock.state={...mock.state!,ratings:mock.state!.ratings.map(r=>r.sport==="cycling"?{...r,optedIn:false}:r)};
 await act(async()=>renderer.update(createElement(ArenaScreen)));
 expect(renderer.root.findAllByType("LaneTrack" as never)).toHaveLength(1);
 expect(renderer.root.findAllByType("FieldViewSwitcher" as never).length).toBeGreaterThan(0);
});

it("expands one field, retains its viewport and selection, and closes on system Back", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.state = reduceCompete(freshState(), { type: "opt-in", sport: "running" });
  await act(async () => { renderer = create(createElement(ArenaScreen)); });
  await layoutCarousel();
  const lane = () => renderer.root.findByType("LaneTrack" as never);
  const rival = lane().props.lanes.find((item: { you: boolean; ghost: boolean }) => !item.you && !item.ghost);
  await act(async () => { lane().props.onSelect(rival); lane().props.onZoom(2.4); });
  const before = lane().props.view;
  const inlineHeight = lane().props.height;
  expect(inlineHeight).toBeGreaterThanOrEqual(300);
  expect(inlineHeight).toBeLessThanOrEqual(420);
  const anchor = lane().props.anchor;
  anchor.current = { left: 30, laneWidth: 70, width: 350, scroll: 140, oval: false, count: 8 };
  await act(async () => lane().props.onExpand());
  expect(renderer.root.findAllByType("LaneTrack" as never)).toHaveLength(1);
  expect(lane().props.fullscreen).toBe(true);
  expect(lane().props.height).toBeGreaterThan(0);
  expect(lane().props.height).toBeGreaterThan(inlineHeight);
  expect(lane().props.view).toEqual(before);
  expect(lane().props.selectedId).toBe(rival.id);
  expect(lane().props.anchor).toBe(anchor);
  const switcher = () => renderer.root.findByType("FieldViewSwitcher" as never);
  await act(async () => switcher().props.onChange("3d"));
  expect(renderer.root.findByType("PortraitField" as never).props.fullscreen).toBe(true);
  expect(renderer.root.findByType("PortraitField" as never).props.view).toEqual(before);
  await act(async () => switcher().props.onChange("2d"));
  const modal = renderer.root.findByType("Modal" as never);
  expect(modal.props.presentationStyle).toBe("fullScreen");
  await act(async () => modal.props.onRequestClose());
  expect(renderer.root.findAllByType("Modal" as never)).toHaveLength(0);
  expect(lane().props.fullscreen).toBe(false);
  expect(lane().props.view).toEqual(before);
  expect(lane().props.anchor.current.scroll).toBe(140);
});

it("flies to an athlete from the current frame and lets a field drag interrupt it", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const frames = new Map<number, () => void>(); let serial = 0;
  vi.stubGlobal("requestAnimationFrame", (fn: () => void) => { frames.set(++serial, fn); return serial; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  mock.reducedMotion = false;
  mock.state = reduceCompete(freshState(), { type: "opt-in", sport: "running" });
  await act(async () => { renderer = create(createElement(ArenaScreen)); });
  await layoutCarousel();
  const lane = () => renderer.root.findByType("LaneTrack" as never);
  const from = lane().props.view.center;
  const rival = lane().props.lanes.filter((l: { you: boolean; ghost: boolean }) => !l.you && !l.ghost).sort((a: { values: number[] }, b: { values: number[] }) => b.values[2]! - a.values[2]!)[0];
  await act(async () => lane().props.onSelect(rival));
  expect(lane().props.view.center).toBe(from);
  const started = Date.now(); vi.setSystemTime(started + 140);
  await act(async () => { const work = [...frames.values()]; frames.clear(); work.forEach(fn => fn()); });
  expect(lane().props.view.center).not.toBe(from);
  expect(lane().props.view.center).not.toBe(rival.values[2]);
  const manual = lane().props.view.center + .1;
  await act(async () => lane().props.onPan(manual));
  expect(frames.size).toBe(0);
  expect(lane().props.view.center).toBeCloseTo(manual);
  const request = lane().props.focusRequest;
  await act(async () => lane().props.onSelect(rival));
  expect(lane().props.focusRequest).toBe(request + 1);
});
