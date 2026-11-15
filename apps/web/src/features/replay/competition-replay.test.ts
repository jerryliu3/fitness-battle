import { createElement, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { applyDebugEvent, freshState, type CompetitionReplaySelection } from "@fitness-battle/shared";

const mock = vi.hoisted(() => ({ open: undefined as undefined | ((value: boolean) => void) }));

vi.mock("@radix-ui/react-dialog", () => ({
  Root: ({ children, onOpenChange }: { children: ReactNode; onOpenChange: (value: boolean) => void }) => {
    mock.open = onOpenChange;
    return children;
  },
  Trigger: ({ children }: { children: ReactNode }) => children,
  Portal: ({ children }: { children: ReactNode }) => createElement("Portal", null, children),
  Overlay: "Overlay",
  Content: ({ children, ...props }: { children: ReactNode }) => createElement("Content", props, children),
  Title: "Title",
}));
vi.mock("@/features/arena/competition-timeline-context", () => ({
  CompetitionTimelineProvider: ({ children, ...props }: { children: ReactNode }) =>
    createElement("CompetitionTimelineProvider", props, children),
  CompetitionTimelineControls: () => createElement("CompetitionTimelineControls"),
}));
vi.mock("@/features/arena/compete-sheet", () => ({
  CompeteSheet: ({ overview, children, ...props }: { overview: ReactNode; children: ReactNode }) =>
    createElement("CompeteSheet", props, overview, children),
}));
vi.mock("@/features/arena/competition-panel", () => ({
  CompetitionPanel: ({ standings, activity, ...props }: { standings: ReactNode; activity: (visible: boolean) => ReactNode }) =>
    createElement("CompetitionPanel", props, standings, activity(true)),
}));
vi.mock("@/features/arena/race-updates", () => ({ RaceUpdates: "RaceUpdates" }));
vi.mock("@/features/field/components/field-stage", () => ({ FieldStage: "FieldStage" }));

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
});

afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});

it("opens full-screen Compete UI starting replay from the beginning with timeline sheet, standings, feed, and exit", async () => {
  await act(async () => {
    renderer = create(createElement(CompetitionReplayButton, { state, selection, label: "Replay this round", variant: "link" }));
  });
  expect(renderer.root.findAllByType("Portal" as never)).toHaveLength(0);

  await act(async () => mock.open!(true));

  const provider = renderer.root.findByType("CompetitionTimelineProvider" as never);
  expect(provider.props.selection).toEqual(selection);
  expect(provider.props.replay).toBe(true);
  expect(provider.props.active).toBe(true);

  const stages = renderer.root.findAllByType("FieldStage" as never);
  expect(stages).toHaveLength(2);
  expect(stages[0].props.persistent).toBe(true);
  expect(stages[0].props.backgroundMode).toBe(true);
  expect(stages[0].props.model.periodStart).toBe(selection.periodStart);
  expect(stages[1].props.standingsOnly).toBe(true);

  expect(renderer.root.findByType("CompeteSheet" as never).props.scrollable).toBe(true);
  expect(renderer.root.findAllByType("CompetitionTimelineControls" as never)).toHaveLength(1);
  expect(renderer.root.findByType("RaceUpdates" as never).props.sport).toBe("running");

  await act(async () => stages[1].props.onFocusAthlete("peer-1"));
  expect(renderer.root.findAllByType("FieldStage" as never)[0].props.externalAthleteFocus?.id).toBe("peer-1");
});
