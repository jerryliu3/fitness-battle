import { createElement, useState } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import type { ArenaViewWindow } from "@fitness-battle/shared";
vi.mock("./field-overlay-motion", () => ({ FieldOverlayGroup: "FieldOverlayGroup", FieldOverlayView: "View" }));
vi.mock("react-native", () => ({ StyleSheet: { create: (value: unknown) => value }, PanResponder: { create: (panHandlers: object) => ({ panHandlers }) }, Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View" }));
vi.mock("react-native-svg", () => Object.fromEntries(["default", "Circle", "Defs", "ClipPath", "Image", "G", "Path", "Rect", "Text"].map(k => [k, `Svg${k}`])));
vi.mock("../lib/haptics", () => ({ playCue() {} }));
vi.mock("./field-course", () => ({ drawFieldNode: () => null }));
vi.mock("./polished-racer", () => ({ PolishedRacer: "Racer" }));
import { LaneTrack } from "./lane-track";

let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });
it("keeps the native field over a quarter wide while longitudinal distances keep zooming out", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const lanes = Array.from({ length: 7 }, (_, i) => ({ id: String(i), name: `Peer ${i}`, you: i === 3, ghost: false, values: [485 + i * .1, 485 + i * .1, 485 + i * .1] as [number, number, number] }));
  const props = { lanes, unit: "km", showGhost: false, index: 2, fullscreen: true, animateSelection: false, appearance: { ground: "straight" as const, edges: "club" as const }, onSelect() {} };
  await act(async () => { renderer = create(createElement(LaneTrack, { ...props, view: { center: 485, span: 12 } })); });
  await act(async () => renderer.root.findAllByType("View" as never).find(n => n.props.onLayout)!.props.onLayout({ nativeEvent: { layout: { width: 390 } } }));
  const positions = () => renderer.root.findAllByType("SvgPath" as never).filter(n => n.props.strokeWidth === 6).map(n => (n.props.d.match(/-?\d+(?:\.\d+)?/g) as string[]).map(Number).slice(-2)).sort((a, b) => a[0]! - b[0]!);
  const a = positions();
  expect(a).toHaveLength(7);
  expect(a.at(-1)![0]! - a[0]![0]!).toBeCloseTo(390 / 3.9);
  await act(async () => renderer.update(createElement(LaneTrack, { ...props, view: { center: 485, span: 24 } })));
  const b = positions();
  expect(b.map(p => p[0])).toEqual(a.map(p => p[0]));
  expect((b.at(-1)![1]! - b[0]![1]!) / (a.at(-1)![1]! - a[0]![1]!)).toBeCloseTo(.5);
});
it("owns diagonal fullscreen drags, coalesces events, and continues panning after a pinch", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let work: (() => void) | null = null;
  const schedule = vi.fn((fn: () => void) => { work = fn; return 1; });
  vi.stubGlobal("requestAnimationFrame", schedule);
  vi.stubGlobal("cancelAnimationFrame", () => { work = null; });
  const applied = vi.fn();
  const lanes = Array.from({ length: 12 }, (_, i) => ({ id: String(i), name: `Peer ${i}`, you: i === 6, ghost: false, values: [10, 10, 10] as [number, number, number] }));
  function Probe() {
    const [view, setView] = useState({ center: 10, span: 2 });
    return createElement(LaneTrack, { lanes, unit: "km", showGhost: false, index: 2, fullscreen: true, animateSelection: false, view, onViewChange: (next: ArenaViewWindow) => { applied(next); setView(next); }, onSelect() {} });
  }
  await act(async () => { renderer = create(createElement(Probe)); });
  const responder = () => renderer.root.findAllByType("View" as never).find(n => n.props.onPanResponderMove)!;
  const event = (points: number[][]) => ({ nativeEvent: { pageX: points[0]![0], pageY: points[0]![1], locationX: points[0]![0], locationY: points[0]![1], touches: points.map(([pageX, pageY]) => ({ pageX, pageY })) } });
  const flush = async () => { const fn = work; work = null; await act(async () => fn?.()); };
  expect(renderer.root.findAllByType("ScrollView" as never)).toHaveLength(0);
  const initialViewport = renderer.root.findByType("Svgdefault" as never).props.viewBox;
  expect(responder().props.onMoveShouldSetPanResponderCapture(event([[100, 300]]), { dx: 20, dy: 20 })).toBe(true);
  await act(async () => {
    responder().props.onPanResponderGrant(event([[100, 300]]));
    responder().props.onPanResponderMove(event([[110, 310]]));
    responder().props.onPanResponderMove(event([[140, 350]]));
  });
  expect(applied).not.toHaveBeenCalled(); expect(schedule).toHaveBeenCalledTimes(1);
  await flush(); expect(applied.mock.lastCall![0].center).toBeGreaterThan(10);
  expect(renderer.root.findByType("Svgdefault" as never).props.viewBox).not.toBe(initialViewport);
  await act(async () => responder().props.onPanResponderRelease());
  await act(async () => {
    responder().props.onPanResponderGrant(event([[100, 300], [200, 300]]));
    responder().props.onPanResponderMove(event([[50, 300], [250, 300]]));
  });
  await flush(); expect(applied.mock.lastCall![0].span).toBeCloseTo(1);
  const count = applied.mock.calls.length;
  await act(async () => responder().props.onPanResponderMove(event([[50, 300]])));
  expect(applied).toHaveBeenCalledTimes(count);
  await act(async () => responder().props.onPanResponderMove(event([[50, 320]])));
  await flush(); expect(applied.mock.lastCall![0].span).toBeCloseTo(1);
  expect(applied.mock.lastCall![0].center).toBeGreaterThan(applied.mock.calls[count - 1]![0].center);
});

it("labels offscreen athletes from the window edge and removes hidden arrow hit targets", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", vi.fn());
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const props = {
    lanes: [
      { id: "me", name: "You", you: true, ghost: false, values: [10, 10, 10] as [number, number, number] },
      { id: "ahead", name: "Ahead", you: false, ghost: false, values: [20, 20, 20] as [number, number, number] },
    ],
    unit: "km", index: 2 as const, showGhost: false, fullscreen: true, animateSelection: false,
    view: { center: 10, span: 2 }, onSelect() {},
  };
  await act(async () => { renderer = create(createElement(LaneTrack, props)); });
  const arrows = () => renderer.root.findAllByType("Pressable" as never).filter(node => node.props.accessibilityLabel === "Focus Ahead");
  expect(arrows()).toHaveLength(1);
  expect(renderer.root.findAllByType("SvgText" as never).some(node => node.props.children === "9.0 km")).toBe(true);
  await act(async () => renderer.update(createElement(LaneTrack, { ...props, overlaysHidden: true })));
  expect(arrows()).toHaveLength(0);
  expect(renderer.root.findAllByType("FieldOverlayGroup" as never).some(node => node.props.hidden)).toBe(true);
});
