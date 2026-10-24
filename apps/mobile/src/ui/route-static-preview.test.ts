import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MARIN_HEADLANDS_ROUTE_COORDINATES } from "@fitness-battle/shared";

vi.mock("../lib/env", () => ({
  mobileEnv: {
    mapboxAccessToken: "pk.test-mobile-token",
  },
}));

vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Image: "Image",
  TouchableOpacity: "TouchableOpacity",
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: {
    create: (v: unknown) => v,
    absoluteFillObject: {},
  },
}));

vi.mock("react-native-svg", () => ({
  default: "Svg",
  Polyline: "Polyline",
  Circle: "Circle",
}));

import { RouteStaticPreview } from "./route-static-preview";

let renderer: ReactTestRenderer;

afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.clearAllMocks();
});

describe("Mobile RouteStaticPreview", () => {
  it("renders Image with Mapbox Static API url when token is present", async () => {
    await act(async () => {
      renderer = create(
        createElement(RouteStaticPreview, {
          coordinates: MARIN_HEADLANDS_ROUTE_COORDINATES,
          mapboxToken: "pk.test-mobile-token",
          strokeColor: "f7c948",
          width: 500,
          height: 300,
        }),
      );
    });

    const img = renderer.root.findByType("Image" as never);
    expect(img).toBeDefined();
    expect(img.props.source.uri).toContain("https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/");
    expect(img.props.source.uri).toContain("path-4+f7c948-0.9(");
    expect(img.props.source.uri).toContain("access_token=pk.test-mobile-token");

    // Check badge text
    const badgeText = renderer.root.findAllByType("Text" as never).find(
      (node) => node.props.children === "Play 3D Replay",
    );
    expect(badgeText).toBeDefined();
  });

  it("handles onPress callback via TouchableOpacity", async () => {
    const onPress = vi.fn();
    await act(async () => {
      renderer = create(
        createElement(RouteStaticPreview, {
          coordinates: MARIN_HEADLANDS_ROUTE_COORDINATES,
          mapboxToken: "pk.test-token",
          onPress,
        }),
      );
    });

    const touchable = renderer.root.findByType("TouchableOpacity" as never);
    expect(touchable).toBeDefined();
    await act(async () => {
      touchable.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders SVG fallback when no Mapbox token is provided", async () => {
    await act(async () => {
      renderer = create(
        createElement(RouteStaticPreview, {
          coordinates: MARIN_HEADLANDS_ROUTE_COORDINATES,
          mapboxToken: "", // empty
        }),
      );
    });

    const svg = renderer.root.findByType("Svg" as never);
    expect(svg).toBeDefined();
    const polyline = renderer.root.findByType("Polyline" as never);
    expect(polyline).toBeDefined();
    expect(polyline.props.points.length).toBeGreaterThan(0);
  });
});
