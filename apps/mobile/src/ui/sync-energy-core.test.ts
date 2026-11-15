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

it("shows total time and activity count around the effort core", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let renderer: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(createElement(SyncEnergyCore, {
      activities: [activity, { ...activity, id: "ride", elevationGainM: null }], benchmarkSeconds: 7200, units: "metric", draining: false,
    }));
  });
  const text = renderer!.root.findAllByType("Text" as never).map(node => [node.props.children].flat().join("")).join(" ");
  expect(text).toContain("10.0 km");
  expect(text).toContain("Distance");
  expect(text).toContain("1h 0m");
  expect(text).toContain("Total time");
  expect(text).toContain("2");
  expect(text).toContain("Activities");
  expect(text).toContain("+10.1");
  expect(text).toContain("effort");
  expect(text).not.toContain("synced moving time selected");
  expect(text).not.toContain("Elevation");
  expect(withTiming).toHaveBeenCalledWith(.5, expect.objectContaining({ duration: 1100, reduceMotion: "system" }));
  await act(async () => renderer!.unmount());
});

it("keeps battery charge intact when saving (no depletion animation) and handles empty selection", async () => {
  vi.mocked(withTiming).mockClear();
  let renderer: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(createElement(SyncEnergyCore, { activities: [activity], benchmarkSeconds: 3600, units: "us", draining: true }));
  });
  expect(withTiming).toHaveBeenCalledWith(.5, expect.objectContaining({ duration: 1100 }));
  expect(withTiming).not.toHaveBeenCalledWith(0, expect.anything());
  await act(async () => {
    renderer!.update(createElement(SyncEnergyCore, { activities: [], benchmarkSeconds: 0, units: "us", draining: true }));
  });
  const text = renderer!.root.findAllByType("Text" as never).map(node => [node.props.children].flat().join("")).join(" ");
  expect(text).toContain("0.0 mi");
  expect(text).toContain("0m");
  expect(text).toContain("0");
  expect(text).toContain("+0");
  expect(text).toContain("effort");
  expect(text).not.toContain("NaN");
  await act(async () => renderer!.unmount());
});
