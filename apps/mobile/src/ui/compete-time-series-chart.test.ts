import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { freshState, reduceCompete } from "@fitness-battle/shared";

const mocks = vi.hoisted(() => ({ loopStart: vi.fn(), loopStop: vi.fn() }));

vi.mock("react-native", () => ({
  useColorScheme: () => "light",
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) },
  Animated: {
    View: "AnimatedView",
    Value: class {
      setValue() {}
      interpolate() { return 0.5; }
    },
    timing: () => ({}),
    loop: () => ({ start: mocks.loopStart, stop: mocks.loopStop }),
  },
  Easing: { ease: (x: number) => x, inOut: (fn: unknown) => fn },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
  StyleSheet: {
    create: (value: unknown) => value,
    flatten: (style: unknown) => Object.assign({}, ...(Array.isArray(style) ? style.flat(Infinity) : [style]).filter(Boolean)),
  },
}));
vi.mock("react-native-svg", () => ({
  default: "Svg",
  Circle: "Circle",
  G: "G",
  Line: "Line",
  Polyline: "Polyline",
  Rect: "Rect",
  Text: "SvgText",
}));
vi.mock("./section", () => ({ chartTextProps: () => ({}), textStyle: () => ({}) }));
vi.mock("./athlete-pennant", () => ({ AthletePennant: "AthletePennant" }));
vi.mock("./use-reduced-motion", () => ({ useReducedMotion: () => false }));
vi.mock("../lib/athlete-blocks", () => ({ useAthleteBlocks: () => ({ blocks: [] }) }));
vi.mock("../lib/haptics", () => ({ playCue() {} }));

import { CompeteTimeSeriesChart } from "./compete-time-series-chart";

let renderer: ReactTestRenderer;
afterEach(async () => {
  mocks.loopStart.mockClear();
  mocks.loopStop.mockClear();
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});

it("uses solid backgrounds and pulses the selected athlete position", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const now = new Date("2026-10-26T18:00:00Z");
  const state = reduceCompete(freshState(now), { type: "opt-in", sport: "strength", now: now.toISOString() });

  await act(async () => {
    renderer = create(createElement(CompeteTimeSeriesChart, { state, sport: "strength", immersive: true }));
  });
  const root = renderer.root.find((node) => node.props.accessibilityLabel === "Weekly competition time-series graph");
  const styles = Object.assign({}, ...(Array.isArray(root.props.style) ? root.props.style.filter(Boolean) : [root.props.style]));
  expect(styles.backgroundColor).toBeTruthy();
  expect(styles.backgroundColor).not.toBe("transparent");
  expect(mocks.loopStart).toHaveBeenCalled();

  const plot = renderer.root.find((node) => typeof node.props.onLayout === "function");
  await act(async () => {
    plot.props.onLayout({ nativeEvent: { layout: { width: 358, height: 464 } } });
  });
  expect(renderer.root.findAllByType("AnimatedView" as never).length).toBeGreaterThan(0);
});
