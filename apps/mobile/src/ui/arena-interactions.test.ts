import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { freshState, reduceCompete, type CompeteState } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ state: null as CompeteState | null, mounts: 0, dispatch: vi.fn() }));
vi.mock("react-native", async () => {
  const { createElement } = await import("react");
  function View({ children, ...props }: { children?: unknown }) {
    const inspect = (node: unknown): void => {
      if (Array.isArray(node)) node.forEach(inspect);
      else if (typeof node === "string" || typeof node === "number") throw Error("Bare text in native View");
    };
    inspect(children);
    return createElement("View", props, children as never);
  }
  return { StyleSheet: { create: (styles: unknown) => styles }, View, Pressable: "Pressable", ScrollView: "ScrollView", Switch: "Switch", Text: "Text" };
});
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
vi.mock("expo-router", () => ({ usePathname: () => "/arena", useRouter: () => ({ navigate: vi.fn() }) }));
vi.mock("../lib/auth", () => ({ useAuth: () => ({ user: { id: "audit" }, demoMode: true }) }));
vi.mock("../lib/compete-store", () => ({ useCompeteStore: () => ({
  state: mock.state, dispatch: mock.dispatch, accountKey: "audit", readBaselineItem: () => null, writeBaselineItem() {},
}) }));
vi.mock("../lib/haptics", () => ({ playCue: vi.fn() }));
vi.mock("../lib/score-track-lens", () => ({ useScoreTrackLens: () => ["open", vi.fn()] }));
vi.mock("../features/crew", () => ({ useCrewApi: () => ({ live: false }) }));
vi.mock("../features/competition-summary", () => ({ CompetitionSummary: () => null }));
vi.mock("../features/sleep-panel", () => ({ SleepPanel: () => null }));
vi.mock("./arena-3d", () => ({ Arena3D: () => null }));
vi.mock("./award-shelf", () => ({ AwardShelf: () => null }));
vi.mock("./zoom-control", () => ({ ZoomControl: "ZoomControl" }));
vi.mock("./use-reduced-motion", () => ({ useReducedMotion: () => true }));
vi.mock("./focus", () => ({ FocusButton: "FocusButton", FocusSegments: "Segments", FocusTextButton: "TextButton", FocusDisclosure: "Disclosure", FocusSheet: "Sheet", f: {} }));
vi.mock("./lane-track", async () => {
  const { createElement, useEffect } = await import("react");
  return { LaneTrack: (props: object) => {
    useEffect(() => { mock.mounts++; }, []);
    return createElement("LaneTrack", props);
  } };
});
import ArenaScreen from "../../app/(tabs)/arena";
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });
describe("native competition interactions", () => {
  it("renders registration without bare error text and retains the lane instance across standings", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mock.mounts = 0;
    mock.state = reduceCompete(freshState(), { type: "opt-in", sport: "running" });
    await act(async () => { renderer = create(createElement(ArenaScreen)); });
    const lane = () => renderer.root.findByType("LaneTrack" as never);
    const viewControl = () => renderer.root.findAllByType("Segments" as never).find((node) => node.props.label === "Field view")!;
    expect(mock.mounts).toBe(1);
    await act(async () => viewControl().props.onChange("Standings"));
    expect(lane().props.active).toBe(false);
    await act(async () => viewControl().props.onChange("2D lanes"));
    expect(lane().props.active).toBe(true);
    expect(mock.mounts).toBe(1);
    const register = renderer.root.findAllByType("FocusButton" as never).find((node) => node.props.label === "＋ Register for another event")!;
    await act(async () => register.props.onPress());
    expect(renderer.root.findByType("Sheet" as never).props.open).toBe(true);
  });
});
