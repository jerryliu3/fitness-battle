import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { freshState, reduceCompete } from "@fitness-battle/shared";
vi.mock("react-native", () => ({ View: "View", Pressable: "Pressable", Text: "Text" }));
vi.mock("../ui/app-icon", () => ({ AppIcon: "AppIcon" }));
vi.mock("../ui/use-reduced-motion", () => ({ useReducedMotion: () => false }));
vi.mock("../lib/athlete-blocks", () => ({ useAthleteBlocks: () => ({ blocks: [] }) }));
vi.mock("../ui/section", () => ({ AppText: "AppText", textStyle: () => ({}) }));
vi.mock("./replay-timeline", () => ({ ReplayTimeline: "ReplayTimeline" }));
import { PointsTimeline } from "./points-timeline";
it("uses the full scrubber range immediately after the wave starts", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const state = reduceCompete(freshState(new Date("2026-10-19T09:00:00Z")), { type: "opt-in", sport: "strength", now: "2026-10-19T09:00:00Z" });
  state.demoNow = new Date(Date.parse(state.enrollments[0]!.waveStart) + 30_000).toISOString();
  const onChange = vi.fn();
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(createElement(PointsTimeline, { state, event: "strength", fraction: null, onChange })); });
  try {
    const slider = tree.root.findByType("ReplayTimeline" as never);
    expect(slider.props.count).toBe(1000);
    expect(slider.props.cursor).toBe(1000);
    expect(slider.props.timeBased).toBe(true);
    slider.props.onSeek(500);
    expect(onChange.mock.lastCall![0]).toBeGreaterThan(0);
    expect(onChange.mock.lastCall![0]).toBeLessThan(.001);
    slider.props.onSeek(1000);
    expect(onChange).toHaveBeenLastCalledWith(null);
  } finally { await act(async () => tree.unmount()); vi.unstubAllGlobals(); }
});
