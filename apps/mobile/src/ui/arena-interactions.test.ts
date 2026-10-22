import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
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
    Pressable: "Pressable",
    ScrollView: "ScrollView",
    Switch: "Switch",
    Text: "Text",
  };
});
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));
vi.mock("expo-router", () => ({
  usePathname: () => "/arena",
  useRouter: () => ({ navigate: vi.fn() }),
}));
vi.mock("../lib/auth", () => ({
  useAuth: () => ({ user: { id: "audit" }, demoMode: true }),
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
vi.mock("../features/competition-summary", () => ({
  CompetitionSummary: () => null,
}));
vi.mock("../features/sleep-panel", () => ({ SleepPanel: () => null }));
vi.mock("../features/round-takeover", () => ({ RoundTakeover: () => null }));
vi.mock("./arena-3d", () => ({ Arena3D: () => null }));
vi.mock("./award-shelf", () => ({ AwardShelf: () => null }));
vi.mock("react-native-svg", () => ({ default: "Svg" }));
vi.mock("./polished-racer", () => ({ PolishedRacer: "PolishedRacer" }));
vi.mock("./zoom-control", () => ({ ZoomControl: "ZoomControl" }));
vi.mock("./use-reduced-motion", () => ({
  useReducedMotion: () => mock.reducedMotion,
}));
vi.mock("./focus", () => ({
  FocusButton: "FocusButton",
  FocusSegments: "Segments",
  FocusTextButton: "TextButton",
  FocusDisclosure: "Disclosure",
  FocusSheet: "Sheet",
  f: {},
}));
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
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
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
    const lane = () => renderer.root.findByType("LaneTrack" as never);
    const viewControl = () =>
      renderer.root
        .findAllByType("Segments" as never)
        .find((node) => node.props.label === "Running field view")!;
    expect(mock.mounts).toBe(1);
    const rival = lane().props.lanes.find(
      (item: { you: boolean; ghost: boolean }) => !item.you && !item.ghost,
    );
    await act(async () => lane().props.onSelect(rival));
    expect(lane().props.view.center).toBe(rival.values[2]);
    expect(JSON.stringify(renderer.toJSON())).not.toContain("athlete details");
    expect(JSON.stringify(renderer.toJSON())).not.toContain(" · Place ");
    await act(async () => viewControl().props.onChange("standings"));
    expect(lane().props.active).toBe(false);
    await act(async () => viewControl().props.onChange("lanes"));
    expect(lane().props.active).toBe(true);
    expect(mock.mounts).toBe(1);
    const register = renderer.root
      .findAllByType("FocusButton" as never)
      .find((node) => node.props.label === "＋ Register")!;
    await act(async () => register.props.onPress());
    expect(renderer.root.findByType("Sheet" as never).props.open).toBe(true);
  });

  it("uses the animated field rank instead of counting the athlete's final position as a rival", async () => {
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
    mock.state = reduceCompete(mock.state, {
      type: "log-manual",
      activityId: "review-run",
      sport: "running",
      distanceM: 1609.344,
      movingSec: 600,
    });
    await act(async () => renderer.update(createElement(ArenaScreen)));
    const lane = renderer.root.findByType("LaneTrack" as never);
    const frame = lane.props.overtakeFrame;
    expect(frame).not.toBeNull();
    const rankText = renderer.root
      .findAllByType("Text" as never)
      .find((node) => node.props.children?.[1] === " / ")!;
    expect(rankText.props.children[0]).toBe(frame.currentRank);
    expect(frame.currentRank).toBeLessThanOrEqual(
      lane.props.lanes.filter((item: { ghost: boolean }) => !item.ghost).length,
    );
  });


});

it("mounts only one registered sport and replaces it when switching",async()=>{
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
 mock.dispatch.mockClear();
 mock.state=reduceCompete(reduceCompete(freshState(),{type:"opt-in",sport:"running"}),{type:"opt-in",sport:"cycling"});
 await act(async()=>{renderer=create(createElement(ArenaScreen));});
 expect(renderer.root.findAllByType("LaneTrack" as never)).toHaveLength(1);
 const choice=renderer.root.findAllByType("Pressable" as never).find(n=>n.props.accessibilityLabel==="Show Cycling")!;
 await act(async()=>choice.props.onPress());
 expect(renderer.root.findAllByType("LaneTrack" as never)).toHaveLength(1);
 expect(renderer.root.findAllByType("Segments" as never).some(n=>n.props.label==="Cycling field view")).toBe(true);
 expect(renderer.root.findAllByType("Segments" as never).some(n=>n.props.label==="Running field view")).toBe(false);
 expect(mock.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({type:"set-primary"}));
 mock.state={...mock.state!,ratings:mock.state!.ratings.map(r=>r.sport==="cycling"?{...r,optedIn:false}:r)};
 await act(async()=>renderer.update(createElement(ArenaScreen)));
 expect(renderer.root.findAllByType("LaneTrack" as never)).toHaveLength(1);
 expect(renderer.root.findAllByType("Segments" as never).some(n=>n.props.label==="Running field view")).toBe(true);
});
