import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { encodePolyline, MARIN_HEADLANDS_ROUTE_COORDINATES } from "@fitness-battle/shared";

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

const mockInjectJavaScript = vi.hoisted(() => vi.fn());

vi.mock("react-native-webview", async () => {
  const { createElement, forwardRef, useImperativeHandle } = await import("react");
  return {
  default: forwardRef((props: Record<string, unknown>, ref) => {
    useImperativeHandle(ref, () => ({ injectJavaScript: mockInjectJavaScript }));
    return createElement("WebView", props);
  }),
  };
});

import { RouteTimelapse } from "./route-timelapse";

let renderer: ReactTestRenderer;

afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.clearAllMocks();
});

describe("Mobile RouteTimelapse", () => {
  it("uses a short scene URL and transfers full geometry after the bridge is ready", async () => {
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
    expect(webView.props.source.uri).not.toContain("polyline=");
    await act(async () => webView.props.onMessage({ nativeEvent: { data: JSON.stringify({ type: "route-ready" }) } }));
    expect(mockInjectJavaScript).toHaveBeenCalledWith(expect.stringContaining(JSON.stringify(encodePolyline(MARIN_HEADLANDS_ROUTE_COORDINATES))));
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
