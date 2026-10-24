import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) },
  Text: "Text", View: "View", StyleSheet: { create: (value: unknown) => value },
}));
vi.mock("react-native-svg", () => ({ default: "Svg", Circle: "Circle", Line: "Line" }));
vi.mock("./focus", () => ({ f: {} }));
vi.mock("../lib/haptics", () => ({ playCue: vi.fn() }));
import { playCue } from "../lib/haptics";
import { ChartScrubber, nearestChartDatum } from "./chart-scrubber";

const points = [
  { id: "mon", x: 20, y: 90, label: "Monday", value: "1 hr" },
  { id: "tue", x: 80, y: 30, label: "Tuesday", value: "3 hr" },
];
let renderer: ReactTestRenderer;
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.clearAllMocks(); vi.unstubAllGlobals();
});

it("snaps only to real points, including the ends and empty series", () => {
  expect(nearestChartDatum(points, -100)?.id).toBe("mon");
  expect(nearestChartDatum(points, 1000)?.id).toBe("tue");
  expect(nearestChartDatum([], 20)).toBeUndefined();
});

it("scrubs in rendered coordinates, pulses once per crossed point and yields vertical gestures", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const select = vi.fn();
  await act(async () => { renderer = create(createElement(ChartScrubber, {
    points, width: 100, height: 120, plotTop: 10, plotBottom: 100, onSelect: select, label: "Hours", children: null,
  })); });
  const surface = () => renderer.root.findAllByType("View" as never).find(node => node.props.accessibilityRole === "adjustable")!;
  await act(async () => surface().props.onLayout({ nativeEvent: { layout: { width: 300 } } }));
  await act(async () => surface().props.onPanResponderGrant({ nativeEvent: { locationX: 60 } }));
  await act(async () => surface().props.onPanResponderMove({ nativeEvent: { locationX: 80 } }, { dx: 20, dy: 0 }));
  expect(select).toHaveBeenCalledExactlyOnceWith("mon");
  await act(async () => surface().props.onPanResponderMove({ nativeEvent: { locationX: 240 } }, { dx: 180, dy: 0 }));
  expect(select.mock.lastCall).toEqual(["tue"]);
  expect(playCue).toHaveBeenCalledTimes(2);
  expect(surface().props.accessibilityValue.text).toBe("Tuesday, 3 hr");
  expect(renderer.root.findByType("Line" as never).props.x1).toBe(80);
  expect(surface().props.onPanResponderTerminationRequest()).toBe(false);
  expect(surface().props.onMoveShouldSetPanResponder(null, { dx: 3, dy: 30 })).toBe(false);
  await act(async () => {
    surface().props.onPanResponderRelease();
    surface().props.onPanResponderGrant({ nativeEvent: { locationX: 240 } });
    surface().props.onPanResponderMove({ nativeEvent: { locationX: 240 } }, { dx: 3, dy: 30 });
  });
  expect(surface().props.onPanResponderTerminationRequest()).toBe(true);
  await act(async () => surface().props.onAccessibilityAction({ nativeEvent: { actionName: "decrement" } }));
  expect(surface().props.accessibilityValue.text).toBe("Monday, 1 hr");
});
