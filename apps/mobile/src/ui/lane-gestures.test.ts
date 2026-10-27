import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { buildArenaModel, freshState, reduceCompete } from "@fitness-battle/shared";
vi.mock("./field-overlay-motion", () => ({ FieldOverlayGroup: "FieldOverlayGroup", FieldOverlayView: "View" }));
vi.mock("react-native", () => ({ StyleSheet: { create: (value: unknown) => value },
  PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) },
  Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View",
}));
vi.mock("react-native-svg", () => Object.fromEntries(["default", "Circle", "Defs", "ClipPath", "Image", "G", "Path", "Rect", "Text"].map(key => [key, `Svg${key}`])));
vi.mock("./field-course", () => ({ drawFieldNode: () => null }));
vi.mock("./polished-racer", () => ({ PolishedRacer: "Racer", usePolishedWakeTime: () => { throw new Error("2D must have no wake clock"); } }));
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
  const owner = renderer.root.findAllByType("View" as never).find(node => node.props.onPanResponderGrant)!;
  const touch = (distance: number) => ({ nativeEvent: { pageX: 0, pageY: 0, locationX: 0, locationY: 0, touches: [{ pageX: 0, pageY: 0 }, { pageX: distance, pageY: 0 }] } });
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
  expect(pan.mock.calls.every(([center]) => Number.isFinite(center))).toBe(true);
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
  expect(zoom).toHaveBeenCalledTimes(2);
});

it("keeps the visible solid route when the start is offscreen and has no native scroll owner", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const lanes = [{ id: "me", name: "Me", initials: "M", you: true, ghost: false, values: [4, 4, 4] as [number, number, number] }];
  await act(async () => { renderer = create(createElement(LaneTrack, { lanes, unit: "km", index: 2, showGhost: false, fullscreen: true, view: { center: 4, span: 1.2 }, onSelect: vi.fn() })); });
  expect(renderer.root.findAllByType("ScrollView" as never)).toHaveLength(0);
  const route = renderer.root.findAllByType("SvgPath" as never).find(n => n.props.strokeWidth === 6)!;
  expect(route.props.d).toContain("L");
  expect(route.props.stroke).toBe("#f7c948");
  expect(renderer.root.findByType("Racer" as never).props.animation).toBeUndefined();
});
