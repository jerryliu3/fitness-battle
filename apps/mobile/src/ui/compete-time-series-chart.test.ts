import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { freshState, reduceCompete } from "@fitness-battle/shared";

const mocks = vi.hoisted(() => ({ loopStart: vi.fn(), loopStop: vi.fn() }));

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  useColorScheme: () => "light",
  View: "View",
  Text: "Text",
  Image: "Image",
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
  Path: "Path",
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

it("renders the streamlined athlete header in immersive mode and switches between Trajectory and Event views", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const start = new Date("2026-10-19T09:00:00Z");
  const now = new Date("2026-10-23T18:00:00Z");
  let state = reduceCompete(freshState(start), { type: "opt-in", sport: "strength", now: start.toISOString() });
  state = reduceCompete(state, {
    type: "log-manual",
    sport: "strength",
    activityId: "lift-big",
    movingSec: 10800,
    distanceM: 0,
    startedAt: "2026-10-22T14:00:00Z",
    now: "2026-10-22T18:00:00Z",
  });
  state = {
    ...state,
    activities: state.activities.map((a) => ({ ...a, avgHr: 175, provenance: "recorded" })),
  };

  await act(async () => {
    renderer = create(createElement(CompeteTimeSeriesChart, { state, sport: "strength", immersive: true, view: "trajectory" }));
  });

  const textContent = renderer.root.findAllByType("Text" as never).map((n) => String(n.props.children));
  expect(textContent.some((t) => t.includes("STRENGTH MEET"))).toBe(false);
  expect(textContent.some((t) => t === state.name)).toBe(true);
  expect(textContent.some((t) => /place$/.test(t))).toBe(true);
  expect(textContent.some((t) => t.endsWith("hrs"))).toBe(true);

  const hasVerticalJump = (points: string) => {
    const coords = points.trim().split(/\s+/).map((pair) => pair.split(",").map(Number));
    return coords.some(([x, y], i) => i > 0 && x === coords[i - 1]![0] && y !== coords[i - 1]![1]);
  };

  const trajectoryLines = renderer.root.findAllByType("Polyline" as never).map((n) => String(n.props.points));
  expect(trajectoryLines.some(hasVerticalJump)).toBe(false);

  await act(async () => {
    renderer.update(createElement(CompeteTimeSeriesChart, { state, sport: "strength", immersive: true, view: "event" }));
  });

  const eventLines = renderer.root.findAllByType("Polyline" as never).map((n) => String(n.props.points));
  expect(eventLines).not.toEqual(trajectoryLines);
});
