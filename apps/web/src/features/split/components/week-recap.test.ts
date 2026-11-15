import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { freshState, reduceCompete, rollClock, roundReveal, type CompetitionReplay } from "@fitness-battle/shared";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@radix-ui/react-dialog", () => ({
  Root: "div",
  Trigger: ({ children }: { children: unknown }) => createElement("span", null, children as never),
  Portal: "div",
  Overlay: "div",
  Content: "div",
  Title: "h2",
  Description: "p",
  Close: "button",
}));
vi.mock("motion/react", () => ({
  motion: { div: "div" },
  useReducedMotion: () => true,
}));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("@/features/replay/competition-replay", () => ({
  CompetitionReplayButton: ({ label }: { label?: string }) => createElement("button", { type: "button" }, label),
}));
vi.mock("./weekly-social", () => ({ WeeklySocialActions: () => null }));
vi.mock("./week-recap-fit", () => ({
  WeekRecapFit: ({ children }: { children: unknown }) => children,
}));

import { WeekRecap } from "./week-recap";

let view: ReactTestRenderer | undefined;
afterEach(() => {
  if (view) act(() => view!.unmount());
  view = undefined;
  vi.clearAllMocks();
});

function settledState() {
  const now = "2026-10-19T15:00:00Z";
  let state = reduceCompete(freshState(new Date(now)), {
    type: "opt-in",
    sport: "running",
    accountId: "athlete",
    now,
  });
  state = {
    ...state,
    activities: [{
      id: "run",
      sport: "running",
      startedAt: "2026-10-20T12:00:00Z",
      distanceM: 9656,
      movingSec: 3300,
      avgHr: null,
      source: "strava",
      verified: true,
      disposition: "counted",
    }],
  };
  return { ...rollClock(state, new Date("2026-10-26T04:00:00Z")), name: "Alice Park" };
}

function textContent(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (node && typeof node === "object" && "children" in node) {
    return textContent((node as { children?: unknown }).children);
  }
  return "";
}

function clickButton(label: string) {
  act(() => {
    const button = view!.root.find(
      (el) =>
        el.type === "button" &&
        (el.props["aria-label"] === label || el.props.children === label),
    );
    button.props.onClick();
  });
}

describe("web week recap screens", () => {
  it("renders Race complete podium + Your result card and Week breakdown with Time/Effort toggle and Next round", async () => {
    const state = settledState();
    const result = roundReveal(state)!.results[0]!;
    const replay: CompetitionReplay = {
      sport: "running",
      track: result.track,
      periodStart: result.periodStart,
      periodEnd: result.periodEnd,
      through: result.periodEnd,
      scope: "field",
      athletes: [
        { id: "a", name: "Alice Park", you: true },
        { id: "b", name: "Bob Chen", you: false },
        { id: "c", name: "Carla Diaz", you: false },
      ],
      events: [
        { id: "1", athleteId: "a", at: "2026-10-20T12:00:00Z", distanceM: 9656, movingSec: 3300, effort: 10.4 },
        { id: "2", athleteId: "b", at: "2026-10-20T12:00:00Z", distanceM: 8047, movingSec: 2800, effort: 8.6 },
        { id: "3", athleteId: "c", at: "2026-10-20T12:00:00Z", distanceM: 4828, movingSec: 1800, effort: 5.2 },
      ],
    };
    const onDismiss = vi.fn();

    await act(async () => {
      view = create(
        createElement(WeekRecap, {
          state,
          results: [result],
          social: false,
          loadReplay: async () => replay,
          onDismiss,
        }),
      );
    });

    expect(textContent(view!.toJSON())).toContain("Reveal my finish →");
    await act(async () => {
      clickButton("Reveal my finish →");
    });

    const resultsJson = textContent(view!.toJSON());
    expect(resultsJson).toContain("Race complete!");
    expect(resultsJson).not.toContain("Your week, settled.");
    expect(resultsJson).toContain("Bob Chen");
    expect(resultsJson).toContain("Alice Park");
    expect(resultsJson).toContain("Carla Diaz");
    expect(resultsJson).toContain("Field covered");
    expect(resultsJson).toContain("YOUR RESULT");
    expect(resultsJson).toContain("OVERTAKES");
    expect(resultsJson).toContain("EFFORT");
    expect(resultsJson).toContain("See week breakdown →");

    clickButton("See week breakdown →");
    const breakdownJson = textContent(view!.toJSON());
    expect(breakdownJson).toContain("Week breakdown");
    expect(breakdownJson).not.toContain("Your week in motion.");
    expect(breakdownJson).toContain("Total time");
    expect(breakdownJson).toContain("Sessions");
    expect(breakdownJson).toContain("Best session");
    expect(breakdownJson).not.toContain("Score 1000 →");
    expect(breakdownJson).toContain("Heart-rate zones");
    expect(breakdownJson).toContain("Training time");
    expect(breakdownJson).toContain("Next round");
    expect(breakdownJson).toContain("Update sport settings");

    // Toggle Time -> Effort inside chart card
    const effortTab = view!.root.find((el) => el.type === "button" && el.props.role === "tab" && el.props.children === "Effort");
    act(() => {
      effortTab.props.onClick();
    });
    expect(textContent(view!.toJSON())).toContain("Effort");

    expect(onDismiss).not.toHaveBeenCalled();
    clickButton("Done");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
