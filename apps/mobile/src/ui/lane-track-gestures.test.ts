import { createElement, useState } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import type { ArenaViewWindow } from "@fitness-battle/shared";
vi.mock("react-native", () => ({ StyleSheet: { create: (value: unknown) => value }, PanResponder: { create: (panHandlers: object) => ({ panHandlers }) }, Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View" }));
vi.mock("react-native-svg", () => Object.fromEntries(["default", "Circle", "Defs", "ClipPath", "Image", "G", "Path", "Rect", "Text"].map(k => [k, `Svg${k}`])));
vi.mock("../lib/haptics", () => ({ playCue() {} }));
vi.mock("./field-course", () => ({ drawFieldNode: () => null }));
vi.mock("./polished-racer", () => ({ PolishedRacer: "Racer" }));
import { LaneTrack } from "./lane-track";

let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });
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
