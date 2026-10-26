import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { applyDebugEvent, defaultFieldAppearance, freshState, localCompetitionReplay, type CompetitionReplaySelection } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ debug: true, request: vi.fn(), open: undefined as undefined | ((value: boolean) => void) }));
vi.mock("../lib/auth", () => ({ useAuth: () => ({ user: { id: "signed-in-athlete" }, accessToken: "test-token", offlineMode: false }) }));
vi.mock("../lib/compete-store", () => ({ useCompeteStore: () => ({ debugActive: mock.debug }) }));
vi.mock("../lib/api", () => ({ requestApi: mock.request }));
vi.mock("../lib/env", () => ({ mobileEnv: { apiUrl: "https://example.test" } }));
vi.mock("../ui/use-reduced-motion", () => ({ useReducedMotion: () => true }));
vi.mock("../ui/lane-track", () => ({ LaneTrack: "LaneTrack" }));
vi.mock("../ui/portrait-field", () => ({ PortraitField: "PortraitField" }));
vi.mock("../ui/field-course", () => ({ useFieldAppearance: () => [defaultFieldAppearance] }));
vi.mock("../ui/section", () => ({ AppText: "AppText" }));
vi.mock("../ui/icon-button", () => ({ IconButton: "IconButton" }));
vi.mock("../ui/focus", () => ({ FocusButton: "FocusButton", FocusSegments: "FocusSegments", f: {} }));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaProvider: "SafeAreaProvider", SafeAreaView: "SafeAreaView" }));
vi.mock("react-native", () => ({ Modal: "Modal", View: "View", Pressable: "Pressable", StyleSheet: { create: (value: unknown) => value }, PanResponder: { create: () => ({ panHandlers: {} }) }, AppState: { addEventListener: () => ({ remove() {} }) } }));
import { CompetitionReplayButton } from "./competition-replay";
const state = applyDebugEvent(freshState(new Date("2026-10-25T18:00:00Z")), "overtake-combo", "signed-in-athlete").state;
const selection: CompetitionReplaySelection = { sport: "running", track: "verified", periodStart: "2026-10-19T04:00:00.000Z", periodEnd: "2026-10-26T04:00:00.000Z" };
let renderer: ReactTestRenderer;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.debug = true;
  mock.request.mockReset();
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});
async function open() {
  await act(async () => { renderer = create(createElement(CompetitionReplayButton, { state, selection })); });
  await act(async () => renderer.root.findByType("FocusButton" as never).props.onPress());
}
it("uses the local practice ledger when signed in with Debug active and reloads from the server after reset", async () => {
  await open();
  expect(mock.request).not.toHaveBeenCalled();
  const field = () => renderer.root.findByType("LaneTrack" as never);
  expect(field().props.lanes.map((lane: { id: string }) => lane.id).sort()).toEqual(localCompetitionReplay(state, selection).athletes.map(a => a.id).sort());
  mock.debug = false;
  mock.request.mockResolvedValue(localCompetitionReplay(state, selection));
  await act(async () => renderer.update(createElement(CompetitionReplayButton, { state, selection })));
  expect(mock.request).toHaveBeenCalledTimes(1);
  expect(mock.request.mock.calls[0][2]).toContain("/api/compete/replay?");
});
it("keeps a real authenticated field lookup failure visible instead of substituting a local preview", async () => {
  mock.debug = false;
  mock.request.mockRejectedValue(new Error("field_not_found"));
  await open();
  expect(mock.request).toHaveBeenCalledTimes(1);
  expect(renderer.root.findAllByType("LaneTrack" as never)).toHaveLength(0);
  expect(renderer.root.findAllByType("FocusButton" as never).some(button => button.props.label === "Retry")).toBe(true);
});
