vi.mock("../lib/haptics", () => ({ playCue: vi.fn(), playPattern: vi.fn(() => vi.fn()) }));
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ Text: "Text", View: "View", Pressable: "Pressable", StyleSheet: { create: (x: unknown) => x }, useWindowDimensions: () => ({ fontScale: 2 }) }));
vi.mock("react-native-svg", () => ({ default: "Svg", Text: "SvgText" }));
import { ChartSvg, ChartText } from "./chart-text";

afterEach(() => vi.unstubAllGlobals());
it("counteracts plot stretching while respecting the user's text scale", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(createElement(ChartSvg, { viewBox: "0 0 340 150", preserveAspectRatio: "none" }, createElement(ChartText, { x: 36, y: 20 }, "1140"))); });
  await act(async () => renderer!.root.findByType("Svg" as never).props.onLayout({ nativeEvent: { layout: { width: 170, height: 300 } } }));
  const text = renderer!.root.findByType("SvgText" as never);
  expect(text.props.transform).toBe("translate(36 20) scale(4 1) translate(-36 -20)");
  expect(text.props.fontSize).toBe(13);
  expect(text.props.fontFamily).toBe("Manrope_500Medium");
  await act(async () => renderer!.unmount());
});
