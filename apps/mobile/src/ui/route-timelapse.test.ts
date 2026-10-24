import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MARIN_HEADLANDS_ROUTE_COORDINATES } from "@fitness-battle/shared";

vi.mock("../lib/env", () => ({
  mobileEnv: {
    apiUrl: "https://example.test",
    mapboxAccessToken: "pk.test-token",
  },
}));

vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (v: unknown) => v },
}));

const mockInjectJavaScript = vi.fn();

vi.mock("react-native-webview", () => ({
  default: (props: Record<string, unknown>) => createElement("WebView", props),
}));

import { RouteTimelapse } from "./route-timelapse";

let renderer: ReactTestRenderer;

afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.clearAllMocks();
});

describe("Mobile RouteTimelapse", () => {
  it("renders WebView pointing to /route-scene with encoded polyline and mode", async () => {
    await act(async () => {
      renderer = create(
        createElement(RouteTimelapse, {
          coordinates: MARIN_HEADLANDS_ROUTE_COORDINATES,
          mode: "3d-flyover",
          accentColor: "#f7c948",
        }),
      );
    });

    const webView = renderer.root.findByType("WebView" as never);
    expect(webView).toBeDefined();
    expect(webView.props.source.uri).toContain("https://example.test/route-scene");
    expect(webView.props.source.uri).toContain("mode=3d-flyover");
    expect(webView.props.source.uri).toContain("polyline=");
  });

  it("handles bridge messages from webview", async () => {
    const onFinish = vi.fn();
    await act(async () => {
      renderer = create(
        createElement(RouteTimelapse, {
          coordinates: MARIN_HEADLANDS_ROUTE_COORDINATES,
          onFinish,
        }),
      );
    });

    const webView = renderer.root.findByType("WebView" as never);
    await act(async () => {
      webView.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({ type: "route-finish" }),
        },
      });
    });

    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
