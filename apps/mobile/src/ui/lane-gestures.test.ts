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
vi.mock("./polished-racer", () => ({ PolishedRacer: "Racer", usePolishedWakeTime: () => 0 }));
vi.mock("./icon-button", () => ({ IconButton: "IconButton" }));
vi.mock("../lib/haptics", () => ({ playCue: vi.fn() }));
import { LaneTrack } from "./lane-track";
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });

it("zooms continuously with two fingers, clamps the range, and leaves one-finger page scroll alone", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const zoom = vi.fn(), pan = vi.fn();
  const state = reduceCompete(freshState(), { type: "opt-in", sport: "running" });
  const lanes = buildArenaModel(state).lanes;
  await act(async () => { renderer = create(createElement(LaneTrack, { lanes, unit: "km", index: 2, showGhost: true, view: { center: 4, span: 2 }, onSelect: vi.fn(), onZoom: zoom, onPan: pan })); });
  const owner = renderer.root.findAllByType("View" as never).find(node => node.props.onPanResponderGrant)!;
  const touch = (distance: number) => ({ nativeEvent: { touches: [{ pageX: 0, pageY: 0 }, { pageX: distance, pageY: 0 }] } });
  const single = { nativeEvent: { touches: [{ pageX: 0, pageY: 0 }] } };
  expect(owner.props.onMoveShouldSetPanResponder(single, { dx: 0, dy: 30 })).toBe(false);
  expect(owner.props.onStartShouldSetPanResponderCapture(touch(100))).toBe(true);
  await act(async () => owner.props.onPanResponderGrant(touch(100)));
  await act(async () => owner.props.onPanResponderMove(touch(200), { dx: 0, dy: 0 }));
  expect(zoom.mock.lastCall?.[0]).toBe(1);
  await act(async () => owner.props.onPanResponderMove(touch(50), { dx: 0, dy: 0 }));
  expect(zoom.mock.lastCall?.[0]).toBe(4);
  await act(async () => owner.props.onPanResponderMove(touch(10000), { dx: 0, dy: 0 }));
  expect(zoom.mock.lastCall?.[0]).toBe(.5);
  await act(async () => owner.props.onPanResponderMove(touch(1), { dx: 0, dy: 0 }));
  expect(zoom.mock.lastCall?.[0]).toBe(40);
  expect(pan).not.toHaveBeenCalled();
});
