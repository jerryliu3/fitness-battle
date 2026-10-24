import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("./icon-button", () => ({ IconButton: "IconButton" }));
vi.mock("./club-art", () => ({ alpineTrail: 1 }));
vi.mock("./field-course", () => ({ drawFieldNode: () => null }));
vi.mock("react-native", () => ({
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
  const peer = renderer.root
    .findAllByType("SvgG" as never)
    .find((n) => n.props.accessibilityLabel?.startsWith("Maya"))!;
  await act(async () => peer.props.onPress());
  expect(select).toHaveBeenCalledWith("peer");
});
