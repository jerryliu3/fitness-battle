import { createElement, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { applyDebugEvent, freshState, type CompetitionReplaySelection } from "@fitness-battle/shared";

const mock = vi.hoisted(() => ({ open: false }));

vi.mock("../lib/auth", () => ({ useAuth: () => ({ user: { id: "signed-in-athlete" } }) }));
vi.mock("../lib/haptics", () => ({ playCue() {} }));
vi.mock("../theme", () => ({
  useAppTheme: () => ({ mode: "light" }),
  useThemeColors: () => ({ white: "#ffffff" }),
}));
vi.mock("../ui/use-reduced-motion", () => ({ useReducedMotion: () => true }));
vi.mock("../ui/section", () => ({ AppText: "AppText", textStyle: () => ({}) }));
vi.mock("../ui/app-icon", () => ({ AppIcon: "AppIcon" }));
vi.mock("../ui/focus", () => ({ FocusButton: "FocusButton", useFocusStyles: () => ({ safe: {} }) }));
vi.mock("../ui/compete-sheet", () => ({
  CompeteSheet: ({ overview, children, ...props }: { overview: ReactNode; children: ReactNode }) =>
    createElement("CompeteSheet", props, overview, children),
}));
vi.mock("expo-status-bar", () => ({ StatusBar: "StatusBar" }));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: "SafeAreaProvider",
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 44, bottom: 34 }),
}));
vi.mock("react-native", () => ({
  Modal: ({ visible, children }: { visible: boolean; children: ReactNode }) =>
    visible ? createElement("Modal", null, children) : null,
  Pressable: "Pressable",
  Text: "Text",
  View: "View",
}));
vi.mock("./competition-timeline-context", () => ({
  CompetitionTimelineProvider: ({ children, ...props }: { children: ReactNode }) =>
    createElement("CompetitionTimelineProvider", props, children),
  CompetitionTimelineControls: () => createElement("CompetitionTimelineControls"),
}));
vi.mock("./competition-field", () => ({ CompetitionField: "CompetitionField" }));
vi.mock("./competition-panel", () => ({
  CompetitionPanel: ({ standings, activity, ...props }: { standings: ReactNode; activity: (visible: boolean) => ReactNode }) =>
    createElement("CompetitionPanel", props, standings, activity(true)),
}));
vi.mock("./race-updates", () => ({ RaceUpdates: "RaceUpdates" }));

import { CompetitionReplayButton } from "./competition-replay";

const state = applyDebugEvent(freshState(new Date("2026-10-25T18:00:00Z")), "overtake-combo", "signed-in-athlete").state;
const selection: CompetitionReplaySelection = {
  sport: "running",
  track: "verified",
  periodStart: "2026-10-19T04:00:00.000Z",
  periodEnd: "2026-10-26T04:00:00.000Z",
};

let renderer: ReactTestRenderer;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mock.open = false;
});

afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});

it("opens full-screen Compete UI starting replay from the beginning with timeline sheet, standings, feed, and exit", async () => {
  await act(async () => {
    renderer = create(createElement(CompetitionReplayButton, { state, selection, label: "Replay this round", variant: "link" }));
  });
  expect(renderer.root.findAllByType("Modal" as never)).toHaveLength(0);

  await act(async () => renderer.root.findByType("Pressable" as never).props.onPress());

  const provider = renderer.root.findByType("CompetitionTimelineProvider" as never);
  expect(provider.props.selection).toEqual(selection);
  expect(provider.props.replay).toBe(true);
  expect(provider.props.enabled).toBe(true);

  const fields = renderer.root.findAllByType("CompetitionField" as never);
  expect(fields).toHaveLength(2);
  expect(fields[0].props.persistent).toBe(true);
  expect(fields[0].props.backgroundMode).toBe(true);
  expect(fields[0].props.focusedOverride).toBe(true);
  expect(fields[0].props.periodOverride.startsAt.toISOString()).toBe(selection.periodStart);
  expect(fields[1].props.standingsOnly).toBe(true);

  expect(renderer.root.findByType("CompeteSheet" as never).props.scrollable).toBe(true);
  expect(renderer.root.findAllByType("CompetitionTimelineControls" as never)).toHaveLength(1);
  expect(renderer.root.findByType("RaceUpdates" as never).props.sport).toBe("running");

  await act(async () => fields[1].props.onFocusAthlete("peer-1"));
  expect(renderer.root.findAllByType("CompetitionField" as never)[0].props.externalAthleteFocus?.id).toBe("peer-1");

  await act(async () => renderer.root.findAllByType("CompetitionField" as never)[0].props.onExit());
  expect(renderer.root.findAllByType("Modal" as never)).toHaveLength(0);
});
