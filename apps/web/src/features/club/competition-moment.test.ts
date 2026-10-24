import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { applyDebugEvent, competitionMoments, freshState, momentStorageKey } from "@fitness-battle/shared";
vi.mock("motion/react", () => ({ useReducedMotion: () => true }));
vi.mock("@/lib/haptics", () => ({ playCue: vi.fn() }));
import { CompetitionMoment } from "./competition-moment";
it("reduced motion shows the final result in either direction and confirms at most once", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  for (const direction of ["overtake", "overtaken"] as const) {
    const result = applyDebugEvent(freshState(new Date("2026-10-24T18:00:00Z")), direction, "a");
    const baselines = Object.fromEntries(Object.entries(result.baselines).map(([k,v]) => [momentStorageKey(k),v]));
    const moment = competitionMoments(result.state, "a", k => baselines[k])[0];
    const done = vi.fn(); let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(createElement(CompetitionMoment, { moment, remaining: 1, onConfirm: done })); });
    const button = renderer.root.findByType("button");
    expect(button.props.children).toBe("Back to the app →");
    expect(renderer.root.findByType("svg").props["aria-label"]).toContain(`Place ${moment.plan.rankAfter}`);
    await act(async () => { button.props.onClick(); button.props.onClick(); });
    expect(done).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  }
});
