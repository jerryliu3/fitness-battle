import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  useWindowDimensions: () => ({ fontScale: 1.5, width: 320 }),
  StyleSheet: { create: (value: unknown) => value },
}));
vi.mock("react-native-svg", () => ({
  default: "Svg",
  Circle: "Circle",
  G: "G",
  Line: "Line",
  Path: "Path",
  Polyline: "Polyline",
  Text: "SvgText",
}));
vi.mock("../ui/section", () => ({
  AppText: "Text",
  textStyle: () => ({}),
  chartTextProps: () => ({}),
}));
import { DailyHealth } from "./daily-health";
let view: ReactTestRenderer;
afterEach(async () => {
  if (view) await act(async () => view.unmount());
  vi.unstubAllGlobals();
});
it("opens honest reading details with accessible expanded state and 7-day corridor chart", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await act(async () => {
    view = create(createElement(DailyHealth, { state: freshState(new Date()) }));
  });
  const tiles = () => view.root.findAll((node) => (node.type as unknown) === "Pressable");
  expect(tiles()).toHaveLength(4);
  expect(tiles()[0].props.style[1].width).toBe("100%");
  await act(async () => {
    tiles()[2].props.onPress();
  });
  expect(tiles()[2].props.accessibilityState.expanded).toBe(true);
  expect(JSON.stringify(view.toJSON())).toContain("Baseline corridor: 50–65 bpm");
  expect(JSON.stringify(view.toJSON())).toContain("Resting HR");
  await act(async () => {
    tiles()[2].props.onPress();
  });
  expect(tiles()[2].props.accessibilityState.expanded).toBe(false);
});
