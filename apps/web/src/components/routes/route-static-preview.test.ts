import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { MARIN_HEADLANDS_ROUTE_COORDINATES } from "@fitness-battle/shared";
import { RouteStaticPreview } from "./route-static-preview";

describe("RouteStaticPreview", () => {
  it("renders an <img> with Mapbox Static API URL and retina formatting when token is present", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        createElement(RouteStaticPreview, {
          coordinates: MARIN_HEADLANDS_ROUTE_COORDINATES,
          width: 600,
          height: 400,
          mapboxToken: "pk.test-sample-token",
          strokeColor: "FF5500",
        }),
      );
    });

    const img = renderer!.root.findByType("img");
    expect(img).toBeDefined();
    expect(img.props.src).toContain("https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/");
    expect(img.props.src).toContain("path-4+FF5500-0.9(");
    expect(img.props.src).toContain("access_token=pk.test-sample-token");
    expect(img.props.src).toContain("/auto/600x400@2x");

    // Play badge rendered by default
    const badgeText = renderer!.root.findByProps({ children: "Play 3D Replay" });
    expect(badgeText).toBeDefined();
  });

  it("handles clicks and triggers onClick callback", async () => {
    const handleClick = vi.fn();
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        createElement(RouteStaticPreview, {
          coordinates: MARIN_HEADLANDS_ROUTE_COORDINATES,
          mapboxToken: "pk.test-token",
          onClick: handleClick,
        }),
      );
    });

    const rootContainer = renderer!.root.findByProps({ role: "button" });
    await act(async () => {
      rootContainer.props.onClick();
    });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders SVG fallback when no Mapbox token is configured", async () => {
    let renderer: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        createElement(RouteStaticPreview, {
          coordinates: MARIN_HEADLANDS_ROUTE_COORDINATES,
          mapboxToken: "", // empty token
        }),
      );
    });

    const svgs = renderer!.root.findAllByType("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(1);
    const polyline = renderer!.root.findByType("polyline");
    expect(polyline).toBeDefined();
    expect(polyline.props.points.length).toBeGreaterThan(0);
  });
});
