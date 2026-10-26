import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { buildArenaModel, freshState, reduceCompete } from "@fitness-battle/shared";
vi.mock("react-native", () => ({ StyleSheet: { create: (value: unknown) => value },
  PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) },
  Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View",
}));
vi.mock("react-native-svg", () => Object.fromEntries(["default", "Circle", "Defs", "ClipPath", "Image", "G", "Path", "Rect", "Text"].map(key => [key, `Svg${key}`])));
vi.mock("./field-course", () => ({ drawFieldNode: () => null }));
vi.mock("./polished-racer", () => ({ PolishedRacer: "Racer", usePolishedWakeTime: () => { throw new Error("2D must have no wake clock"); } }));
vi.mock("./local-wake", () => ({ LocalWake: "Wake" }));
vi.mock("./icon-button", () => ({ IconButton: "IconButton" }));
vi.mock("../lib/haptics", () => ({ playCue: vi.fn() }));
import { LaneTrack } from "./lane-track";
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });

it("zooms continuously with two fingers, clamps the range, and leaves one-finger page scroll alone", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let callback: FrameRequestCallback | null = null;
  const request = vi.fn((next: FrameRequestCallback) => { callback = next; return 1; });
  vi.stubGlobal("requestAnimationFrame", request);
  vi.stubGlobal("cancelAnimationFrame", () => { callback = null; });
  const flush = async () => { await act(async () => { const next = callback; callback = null; next?.(0); }); };
  const zoom = vi.fn(), pan = vi.fn();
  const state = reduceCompete(freshState(), { type: "opt-in", sport: "running" });
  const lanes = buildArenaModel(state).lanes;
  await act(async () => { renderer = create(createElement(LaneTrack, { lanes, unit: "km", index: 2, showGhost: true, view: { center: 4, span: 2 }, onSelect: vi.fn(), onZoom: zoom, onPan: pan })); });
  expect(request).not.toHaveBeenCalled();
  expect(renderer.root.findAllByType("Racer" as never).every(n => n.props.showWake === false)).toBe(true);
  expect(renderer.root.findAllByType("Wake" as never).length).toBeLessThanOrEqual(6);
  const owner = renderer.root.findAllByType("View" as never).find(node => node.props.onPanResponderGrant)!;
  const touch = (distance: number) => ({ nativeEvent: { touches: [{ pageX: 0, pageY: 0 }, { pageX: distance, pageY: 0 }] } });
  const single = { nativeEvent: { touches: [{ pageX: 0, pageY: 0 }] } };
  expect(owner.props.onMoveShouldSetPanResponder(single, { dx: 0, dy: 30 })).toBe(false);
  expect(owner.props.onStartShouldSetPanResponderCapture(touch(100))).toBe(true);
  await act(async () => owner.props.onPanResponderGrant(touch(100)));
  await act(async () => owner.props.onPanResponderMove(touch(200), { dx: 0, dy: 0 }));
  await flush();
  expect(zoom.mock.lastCall?.[0]).toBe(1);
  await act(async () => owner.props.onPanResponderMove(touch(50), { dx: 0, dy: 0 }));
  await flush();
  expect(zoom.mock.lastCall?.[0]).toBe(4);
  await act(async () => owner.props.onPanResponderMove(touch(10000), { dx: 0, dy: 0 }));
  await flush();
  expect(zoom.mock.lastCall?.[0]).toBe(.5);
  await act(async () => owner.props.onPanResponderMove(touch(1), { dx: 0, dy: 0 }));
  await flush();
  expect(zoom.mock.lastCall?.[0]).toBe(40);
  expect(pan).not.toHaveBeenCalled();
  zoom.mockClear(); request.mockClear();
  await act(async () => {
    owner.props.onPanResponderMove(touch(200), { dx: 0, dy: 0 });
    owner.props.onPanResponderMove(touch(400), { dx: 0, dy: 0 });
  });
  expect(request).toHaveBeenCalledTimes(1);
  expect(zoom).not.toHaveBeenCalled();
  await act(async () => owner.props.onPanResponderRelease());
  expect(zoom).toHaveBeenCalledExactlyOnceWith(.5);
  expect(callback).toBeNull();
  await act(async () => {
    owner.props.onPanResponderGrant(touch(100));
    owner.props.onPanResponderMove(touch(50), { dx: 0, dy: 0 });
    owner.props.onPanResponderTerminate();
  });
  expect(callback).toBeNull();
  expect(zoom).toHaveBeenCalledTimes(1);
});

it("bounds local wakes to visible lanes and suspends them when the field is inactive", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const lanes = Array.from({ length: 20 }, (_, i) => ({ id: `lane-${i}`, name: `Athlete ${i}`, initials: "A", you: i === 10, ghost: false, values: [4, 4, 4] as [number, number, number] }));
  const props = { lanes, unit: "km", index: 2, showGhost: false, view: { center: 4, span: 1.2 }, onSelect: vi.fn() };
  await act(async () => { renderer = create(createElement(LaneTrack, props)); });
  const wakes = () => renderer.root.findAllByType("Wake" as never);
  expect(wakes().length).toBeGreaterThan(0);
  expect(wakes().length).toBeLessThanOrEqual(7);
  const before = wakes();
  const scroll = renderer.root.findByType("ScrollView" as never);
  await act(async () => scroll.props.onScroll({ nativeEvent: { contentOffset: { x: 0 } } }));
  expect(wakes().length).toBeLessThanOrEqual(7);
  expect(wakes().some(n => before.includes(n))).toBe(false);
  await act(async () => renderer.update(createElement(LaneTrack, { ...props, active: false })));
  expect(wakes()).toHaveLength(0);
});
