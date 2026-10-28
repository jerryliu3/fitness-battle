import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("./field-overlay-motion", () => ({ FieldOverlayGroup: "FieldOverlayGroup", FieldOverlayView: "View" }));
vi.mock("./icon-button", () => ({ IconButton: "IconButton" }));
vi.mock("./club-art", () => ({ alpineTrail: 1 }));
vi.mock("./field-course", () => ({ drawFieldNode: () => null }));
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  PanResponder:{create:(handlers:object)=>({panHandlers:handlers})},
  ScrollView:"ScrollView",
  Animated: { Value: class { constructor(public value: number) {} }, View: "AnimatedView", ScrollView: "ScrollView", event: (_: unknown, options: { listener: (event: unknown) => void }) => options.listener },
  Image: "Image",
  Pressable: "Pressable",
  Text: "Text",
  View: "View",
  StyleSheet: { create: (v: unknown) => v },
}));
vi.mock("react-native-svg", () =>
  Object.fromEntries(
    [
      "default",
      "Circle",
      "ClipPath",
      "Defs",
      "Ellipse",
      "G",
      "Image",
      "LinearGradient",
      "Path",
      "Rect",
      "Stop",
      "Text",
    ].map((k) => [k, `Svg${k}`]),
  ),
);
import { PortraitField } from "./portrait-field";
let renderer: ReactTestRenderer;
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});
it("zooms the local portrait scene and changes peer focus while retaining actual athlete selection", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const zoom = vi.fn(),
    select = vi.fn();
  await act(async () => {
    renderer = create(
      createElement(PortraitField, {
        lanes: [
          { id: "you", you: true, name: "Alex", initials: "A", value: 10 },
          { id: "peer", name: "Maya", initials: "M", value: 10.2 },
        ],
        view: { center: 10, span: 1.2 },
        unit: "km",
        onZoom: zoom,
        onPan: () => {},
        onSelect: select,
      }),
    );
  });
  const button = (label: string) =>
    renderer.root
      .findAllByType("Pressable" as never)
      .find((n) => n.props.accessibilityLabel === label)!;
  await act(async () => button("Zoom in").props.onPress());
  expect(zoom.mock.lastCall?.[0]).toBeCloseTo(0.8);
  await act(async () => button("Zoom out").props.onPress());
  expect(zoom.mock.lastCall?.[0]).toBeCloseTo(1.8);
  await act(async () => button("Previous lane").props.onPress());
  expect(button("Previous lane").props.disabled).toBe(true);
  const peer = button("Focus Maya");
  await act(async () => peer.props.onPress());
  expect(select).toHaveBeenCalledWith("peer");
});

it("owns fullscreen native drags and coalesces the latest two-axis position per frame", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const frames: (() => void)[] = [];
  const request = vi.fn((callback: () => void) => { frames.push(callback); return frames.length; });
  vi.stubGlobal("requestAnimationFrame", request);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const pan = vi.fn();
  await act(async () => {
    renderer = create(createElement(PortraitField, {
      lanes: [
        { id: "a", name: "Ahead", initials: "A", value: 10.2 },
        { id: "you", you: true, name: "Alex", initials: "A", value: 10 },
        { id: "b", name: "Behind", initials: "B", value: 9.8 },
      ],
      view: { center: 10, span: 1.2 }, unit: "km", fullscreen: true,
      onPan: pan, onZoom() {}, onSelect() {},
    }));
  });
  const svg = renderer.root.findAllByType("View" as never).find(n => n.props.onPanResponderMove)!;
  const before = renderer.root.findAllByType("SvgG" as never).map(n => n.props.transform).filter(Boolean);
  expect(svg.props.onMoveShouldSetPanResponderCapture(null, { dx: 20, dy: 40 })).toBe(true);
  await act(async () => {
    svg.props.onPanResponderGrant({ nativeEvent: { pageY: 320, locationY: 320 } }, { dy: 0 });
    svg.props.onPanResponderMove(null, { dx: 20, dy: 30 });
    svg.props.onPanResponderMove(null, { dx: 40, dy: 60 });
  });
  expect(request).toHaveBeenCalledTimes(1);
  expect(pan).not.toHaveBeenCalled();
  await act(async () => frames[0]!());
  expect(pan).toHaveBeenCalledTimes(1);
  expect(pan.mock.calls[0]![0]).toBeGreaterThan(10);
  const after = renderer.root.findAllByType("SvgG" as never).map(n => n.props.transform).filter(Boolean);
  expect(after).not.toEqual(before);
});

it("pinches the native perspective field and retains the distance under the midpoint", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let frame: (() => void) | null = null;
  vi.stubGlobal("requestAnimationFrame", (fn: () => void) => { frame = fn; return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const change = vi.fn();
  await act(async () => { renderer = create(createElement(PortraitField, { lanes: [{ id: "you", name: "You", initials: "Y", you: true, value: 10 }], view: { center: 10, span: 2 }, unit: "km", fullscreen: true, onViewChange: change, onZoom() {}, onPan() {}, onSelect() {} })); });
  const svg = renderer.root.findAllByType("View" as never).find(n => n.props.onPanResponderMove)!;
  const touch = (points: number[][]) => ({ nativeEvent: { pageY: 320, locationY: 320, touches: points.map(([pageX, pageY]) => ({ pageX, pageY })) } });
  expect(svg.props.onStartShouldSetPanResponderCapture(touch([[100, 320], [200, 320]]))).toBe(true);
  await act(async () => {
    svg.props.onPanResponderGrant(touch([[100, 320], [200, 320]]), { dy: 0 });
    svg.props.onPanResponderMove(touch([[50, 320], [250, 320]]), { dx: 0, dy: 0 });
    frame?.();
  });
  expect(change).toHaveBeenCalledTimes(1);
  expect(change.mock.lastCall![0].span).toBeCloseTo(1);
  expect(change.mock.lastCall![0].center).not.toBe(10);
});


it("lets navigation controls interrupt an athlete flight on both camera axes", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const frames = new Map<number, () => void>(); let serial = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: () => void) => { frames.set(++serial, callback); return serial; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  const interrupt = vi.fn(), pan = vi.fn(), zoom = vi.fn();
  const props = {
    lanes: [{ id: "you", name: "You", initials: "Y", you: true, value: 10 }, { id: "peer", name: "Peer", initials: "P", value: 10 }],
    selectedId: "peer", view: { center: 10, span: 2 }, unit: "km",
    onGestureStart: interrupt, onPan: pan, onZoom: zoom, onSelect() {},
  };
  let renderer!: ReturnType<typeof create>;
  await act(async () => { renderer = create(createElement(PortraitField, props)); });
  try {
    for (const [index, label] of ["Next lane", "Move forward", "Zoom in"].entries()) {
      await act(async () => renderer.update(createElement(PortraitField, { ...props, focusRequest: index + 1 })));
      expect(frames.size).toBe(1);
      const button = renderer.root.findAllByType("Pressable" as never).find(node => node.props.accessibilityLabel === label)!;
      await act(async () => button.props.onPress());
      expect(frames.size).toBe(0);
      expect(interrupt).toHaveBeenCalledTimes(index + 1);
    }
    expect(pan).toHaveBeenLastCalledWith(10 + 2 / 3);
    expect(zoom).toHaveBeenLastCalledWith(2 / 1.5);
  } finally { await act(async () => renderer.unmount()); }
});
it("keeps lane geometry while removing a blocked portrait and its controls", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const props = { lanes: [{ id: "you", you: true, name: "Alex", initials: "A", value: 10 }, { id: "peer", name: "Maya", initials: "M", value: 10.2 }], view: { center: 10, span: 1.2 }, unit: "km", onZoom() {}, onPan() {}, onSelect() {} };
  await act(async () => { renderer = create(createElement(PortraitField, props)); });
  const mine = () => renderer.root.findAllByType("Pressable" as never).find(node => node.props.accessibilityLabel === "Focus Alex")!;
  const position = mine().props.style;
  await act(async () => renderer.update(createElement(PortraitField, { ...props, hiddenIds: ["peer"] })));
  expect(mine().props.style).toEqual(position);
  expect(renderer.root.findAllByType("Pressable" as never).some(node => node.props.accessibilityLabel === "Focus Maya")).toBe(false);
  expect(JSON.stringify(renderer.toJSON())).not.toContain("Maya");
});
