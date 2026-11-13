vi.mock("../lib/haptics", () => ({ playCue: vi.fn(), playPattern: vi.fn(() => vi.fn()) }));
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({useColorScheme: () => "light",  Text: "Text", View: "View", Pressable: "Pressable", StyleSheet: { create: (x: unknown) => x }, useWindowDimensions: () => ({ fontScale: 2 }) }));
vi.mock("react-native-svg", () => ({ default: "Svg", Text: "SvgText" }));
import { ChartSvg, ChartText } from "./chart-text";

afterEach(() => vi.unstubAllGlobals());
it("counteracts plot stretching while respecting the user's text scale", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(createElement(ChartSvg, { viewBox: "0 0 340 150", preserveAspectRatio: "none" }, createElement(ChartText, { x: 36, y: 20 }, "1140"))); });
  const svg = renderer!.root.findByType("Svg" as never);
  expect(svg.props.onLayout).toBeUndefined();
  expect(svg.props).toMatchObject({ width: "100%", height: "100%" });
  await act(async () => renderer!.root.findByType("View" as never).props.onLayout({ nativeEvent: { layout: { width: 170, height: 300 } } }));
  const text = renderer!.root.findByType("SvgText" as never);
  expect(text.props.transform).toBe("translate(36 20) scale(4 1) translate(-36 -20)");
  expect(text.props.fontSize).toBe(13);
  expect(text.props.fontFamily).toBe("Manrope_500Medium");
  for (const [width, height, correction] of [[340, 150, "2 2"], [680, 75, "1 4"], [170, 300, "4 1"]] as const) {
    await act(async () => renderer!.root.findByType("View" as never).props.onLayout({ nativeEvent: { layout: { width, height } } }));
    expect(text.props.transform).toBe(`translate(36 20) scale(${correction}) translate(-36 -20)`);
  }
  await act(async () => renderer!.unmount());
});
