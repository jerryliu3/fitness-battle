import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ active: true, reduced: false, timing: vi.fn(), start: vi.fn(), stop: vi.fn() }));
vi.mock("react-native", () => ({
  View: "View", Text: "Text", StyleSheet: { create: (s: unknown) => s },
  Easing: { ease: "ease", inOut: (v: unknown) => v },
  Animated: { View: "NativeHalo", Value: class { setValue() {} interpolate() { return 1; } },
    timing: state.timing, loop: () => ({ start: state.start, stop: state.stop }) },
}));
vi.mock("react-native-svg", () => ({ Circle: "Circle", Polyline: "Polyline", Line: "Line", G: "G" }));
vi.mock("./use-scene-active", () => ({ useSceneActive: () => state.active }));
vi.mock("./use-reduced-motion", () => ({ useReducedMotion: () => state.reduced }));
vi.mock("./chart-text", () => ({ ChartSvg: "Svg", ChartText: "ChartText" }));
vi.mock("./section", () => ({ AppText: "AppText", textStyle: () => ({}) }));
vi.mock("./chart-scrubber", () => ({ ChartScrubber: "Scrubber" }));
vi.mock("../features/chart-range-toggle", () => ({ OpenLineRangeToggle: "Toggle" }));
import { OpenLineChart } from "./open-line-chart";
it("uses native transforms for the live halo and stops on inactivity, selection and reduced motion", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const chart = { width: 340, height: 180, top: 20, bottom: 140, left: 30, right: 320, date: "Today", value: "4", points: [{ x: 300, y: 70, value: "4", label: "Today" }], segments: ["30,100 300,70"], xTicks: [], yTicks: [] };
  const props = { chart: chart as never, label: "Effort", unit: "pts", range: "1w" as never, live: true, onRangeChange: vi.fn() };
  let r!: ReturnType<typeof create>;
  await act(async () => { r = create(createElement(OpenLineChart, props)); });
  expect(state.timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ useNativeDriver: true, isInteraction: false }));
  const layout = r.root.findAllByType("View" as never).find(n => n.props.onLayout)!;
  await act(async () => layout.props.onLayout({ nativeEvent: { layout: { width: 170 } } }));
  expect(r.root.findByType("NativeHalo" as never).parent!.props.style.left).toBe(138);
  state.active = false;
  await act(async () => r.update(createElement(OpenLineChart, { ...props })));
  expect(state.stop).toHaveBeenCalledOnce(); expect(r.root.findAllByType("NativeHalo" as never)).toHaveLength(0);
  state.active = true;
  await act(async () => r.update(createElement(OpenLineChart, { ...props })));
  await act(async () => r.root.findByType("Scrubber" as never).props.onSelectionChange(chart.points[0]));
  expect(state.stop).toHaveBeenCalledTimes(2);
  await act(async () => r.root.findByType("Scrubber" as never).props.onSelectionChange(null));
  state.reduced = true;
  await act(async () => r.update(createElement(OpenLineChart, { ...props })));
  expect(state.stop).toHaveBeenCalledTimes(3);
  expect(r.root.findAllByType("NativeHalo" as never)).toHaveLength(0);
  await act(async () => r.unmount()); vi.unstubAllGlobals();
});
