const activity = vi.hoisted(() => ({ active: true }));
vi.mock("./use-scene-active", () => ({ useSceneActive: () => activity.active }));
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
  activity.active = true;
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("Mobile RouteTimelapse", () => {
  it("uses a short scene URL and transfers full geometry after the bridge is ready", async () => {
    await act(async () => {
      renderer = create(
        createElement(RouteTimelapse, {
          coordinates: MARIN_HEADLANDS_ROUTE_COORDINATES,
          routeReplay: [{ progress: 0, elapsedSec: 0, heartRate: 140 }],
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
    expect(webView.props.source.uri).not.toContain("routeReplay");
    await act(async () => webView.props.onMessage({ nativeEvent: { data: JSON.stringify({ type: "route-ready" }) } }));
    expect(mockInjectJavaScript.mock.calls.at(-1)?.[0]).toContain("routeReplay");
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

it("falls back when iOS terminates a loaded web-content process and resets readiness", async () => {
  const onUnavailable = vi.fn();
  const props = { coordinates: MARIN_HEADLANDS_ROUTE_COORDINATES, onUnavailable };
  await act(async () => { renderer = create(createElement(RouteTimelapse, props)); });
  const web = renderer.root.findByType("WebView" as never);
  await act(async () => web.props.onMessage({ nativeEvent: { data: '{"type":"route-ready"}' } }));
  mockInjectJavaScript.mockClear();
  await act(async () => web.props.onContentProcessDidTerminate());
  expect(onUnavailable).toHaveBeenCalledOnce();
  await act(async () => renderer.update(createElement(RouteTimelapse, { ...props, accentColor: "red" })));
  expect(mockInjectJavaScript).not.toHaveBeenCalled();
});

it("defers bridge injection while inactive and sends the latest route on return", async () => {
  vi.useFakeTimers(); activity.active = false;
  const fail = vi.fn(); const props = { coordinates: MARIN_HEADLANDS_ROUTE_COORDINATES, onUnavailable: fail };
  await act(async () => { renderer = create(createElement(RouteTimelapse, props)); });
  await act(async () => { vi.advanceTimersByTime(60_000); }); expect(fail).not.toHaveBeenCalled();
  await act(async () => renderer.root.findByType("WebView" as never).props.onMessage({ nativeEvent: { data: '{"type":"route-ready"}' } }));
  expect(mockInjectJavaScript).not.toHaveBeenCalled();
  activity.active = true;
  await act(async () => renderer.update(createElement(RouteTimelapse, props)));
  expect(mockInjectJavaScript).toHaveBeenCalledOnce();
});
