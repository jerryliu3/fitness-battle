import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import type { SyncReviewReceipt } from "@fitness-battle/shared";

vi.mock("react-native", () => ({ View: "View", Text: "Text", StyleSheet: { absoluteFill: {} } }));
vi.mock("../theme", () => ({ useThemeColors: () => ({ ink: "white", textOnAction: "navy", tennis: "gold", card: "black", line: "gray", muted: "gray", fieldTeal: "teal" }) }));
vi.mock("./app-icon", () => ({ AppIcon: "AppIcon" }));
vi.mock("./section", () => ({ textStyle: () => ({}) }));
vi.mock("./use-reduced-motion", () => ({ useReducedMotion: () => true }));
vi.mock("react-native-reanimated", () => ({
  default: { View: "AnimatedView", createAnimatedComponent: (component: unknown) => component },
  ReduceMotion: { System: "system" },
  Easing: { inOut: () => "easing", cubic: "cubic", linear: "linear" },
  useSharedValue: (value: number) => ({ value }),
  useAnimatedProps: (read: () => unknown) => read(),
  useAnimatedStyle: (read: () => unknown) => read(),
  withTiming: vi.fn((value: number) => value),
  withRepeat: vi.fn(), withSequence: vi.fn(), cancelAnimation: vi.fn(),
}));
import { withTiming } from "react-native-reanimated";
import { SyncEnergyCore } from "./sync-energy-core";

const activity: SyncReviewReceipt["activities"][number] = {
  id: "run", sport: "running", startedAt: "2026-11-14T12:00:00Z", distanceM: 5000,
  movingSec: 1800, elevationGainM: 100, avgHr: null, source: "strava", verified: true,
};

it("shows four selected totals around a bolt-only core", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let renderer: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(createElement(SyncEnergyCore, {
      activities: [activity, { ...activity, id: "ride", elevationGainM: null }], benchmarkSeconds: 7200, units: "metric", draining: false,
    }));
  });
  const text = renderer!.root.findAllByType("Text" as never).map(node => [node.props.children].flat().join("")).join(" ");
  expect(text).toContain("10.0 km");
  expect(text).toContain("+10.1");
  expect(text).toContain("Effort");
  expect(text).toContain("Activities");
  expect(text).not.toContain("synced moving time selected");
  expect(text).not.toContain("Elevation");
  expect(withTiming).toHaveBeenCalledWith(.5, expect.objectContaining({ reduceMotion: "system" }));
  await act(async () => renderer!.unmount());
});

it("handles empty selection without an invalid charge or effort", async () => {
  let renderer: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(createElement(SyncEnergyCore, { activities: [], benchmarkSeconds: 0, units: "us", draining: true }));
  });
  const text = renderer!.root.findAllByType("Text" as never).map(node => [node.props.children].flat().join("")).join(" ");
  expect(text).toContain("0.0 mi");
  expect(text).toContain("+0");
  expect(text).not.toContain("NaN");
  expect(withTiming).toHaveBeenCalledWith(0, expect.objectContaining({ duration: 780 }));
  await act(async () => renderer!.unmount());
});
