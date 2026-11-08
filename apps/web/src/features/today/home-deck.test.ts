import { createElement, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode }) =>
    createElement("a", props, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/lib/haptics", () => ({
  playCue: vi.fn(),
}));

import { HomeDeck } from "./home-deck";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let renderer: ReactTestRenderer;

afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  mocks.push.mockReset();
});

describe("Web HomeDeck", () => {
  it("renders stacked cards, cycles through route and insights, and supports dismiss/restore when caught up", async () => {
    const now = new Date("2026-10-22T14:00:00.000Z");
    const state = freshState(now);
    state.demoNow = now.toISOString();
    state.units = "metric";
    state.activities = [
      {
        id: "mon-run",
        sport: "running",
        startedAt: "2026-10-19T12:00:00.000Z",
        distanceM: 6000,
        movingSec: 1800,
        avgHr: 140,
        verified: true,
        source: "strava",
        provenance: "recorded",
        disposition: "counted",
      },
    ];
    const onOpenTodaySession = vi.fn();
    const onOpenActivities = vi.fn();

    await act(async () => {
      renderer = create(
        createElement(HomeDeck, {
          accountKey: "web-test-user",
          state,
          onOpenTodaySession,
          onOpenActivities,
        }),
      );
    });

    const text = () => JSON.stringify(renderer.toJSON());
    expect(text()).toContain("RECOVERY-FRIENDLY");
    expect(text()).not.toContain("4 cards");

    const dot2 = renderer.root.find(
      (n) =>
        n.type === "button" &&
        typeof n.props["aria-label"] === "string" &&
        n.props["aria-label"].startsWith("Show card 2 of 4"),
    );
    await act(async () => {
      dot2.props.onClick();
    });
    expect(text()).toContain("Your next chapter starts here.");

    const dot3 = renderer.root.find(
      (n) =>
        n.type === "button" &&
        typeof n.props["aria-label"] === "string" &&
        n.props["aria-label"].startsWith("Show card 3 of 4"),
    );
    await act(async () => {
      dot3.props.onClick();
    });
    expect(text()).toContain("Good things are in motion.");

    // Dismiss 1 card: Reset ↺ should NOT be visible yet
    const dismissBtn1 = renderer.root.find(
      (n) =>
        n.type === "button" &&
        typeof n.props["aria-label"] === "string" &&
        n.props["aria-label"].startsWith("Dismiss "),
    );
    await act(async () => {
      dismissBtn1.props.onClick();
      await new Promise((r) => setTimeout(r, 320));
    });
    expect(text()).not.toContain("Reset ↺");

    // Dismiss remaining 3 cards until all caught up
    for (let i = 0; i < 3; i++) {
      const dismissBtn = renderer.root.find(
        (n) =>
          n.type === "button" &&
          typeof n.props["aria-label"] === "string" &&
          n.props["aria-label"].startsWith("Dismiss "),
      );
      await act(async () => {
        dismissBtn.props.onClick();
        await new Promise((r) => setTimeout(r, 320));
      });
    }

    // Now all caught up: compact message and Reset button appear
    expect(text()).toContain("You’re all caught up.");
    expect(text()).toContain("Reset ↺");

    // Restore cards via Reset button
    const resetBtn = renderer.root.find(
      (n) =>
        n.type === "button" &&
        n.props["aria-label"] === "Reset dismissed cards",
    );
    await act(async () => {
      resetBtn.props.onClick();
    });
    expect(text()).not.toContain("You’re all caught up.");
    expect(text()).toContain("RECOVERY-FRIENDLY");
  });
});
