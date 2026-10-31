import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
const scene = vi.hoisted(() => ({ active: true, inject: vi.fn() }));
vi.mock("./use-scene-active", () => ({ useSceneActive: () => scene.active }));
vi.mock("react-native", () => ({ View: "View", Text: "Text", StyleSheet: { create: (s: unknown) => s } }));
vi.mock("./section", () => ({ textStyle: () => ({}) }));
vi.mock("../lib/env", () => ({ mobileEnv: { apiUrl: "https://example.test" } }));
vi.mock("react-native-webview", async () => {
  const { createElement, forwardRef, useImperativeHandle } = await import("react");
  return { default: forwardRef((props: Record<string, unknown>, ref) => {
    useImperativeHandle(ref, () => ({ injectJavaScript: scene.inject })); return createElement("WebView", props);
  }) };
});
import { Arena3D } from "./arena-3d";
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); scene.active = true; vi.useRealTimers(); vi.clearAllMocks(); vi.unstubAllGlobals(); });
it("cancels queued injection after process death and waits for a fresh handshake", async () => {
  vi.useFakeTimers(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const fail = vi.fn(), props = { model: { lanes: [], revision: 1 } as never, onSelect: vi.fn(), onPan: vi.fn(), onUnavailable: fail };
  await act(async () => { renderer = create(createElement(Arena3D, props)); });
  const web = () => renderer.root.findByType("WebView" as never);
  await act(async () => web().props.onMessage({ nativeEvent: { data: '{"type":"arena-ready"}' } }));
  scene.inject.mockClear();
  await act(async () => renderer.update(createElement(Arena3D, { ...props, model: { lanes: [], revision: 2 } as never })));
  await act(async () => web().props.onContentProcessDidTerminate());
  await act(async () => { vi.advanceTimersByTime(80); });
  expect(scene.inject).not.toHaveBeenCalled(); expect(fail).toHaveBeenCalledOnce();
  await act(async () => web().props.onMessage({ nativeEvent: { data: '{"type":"arena-ready"}' } }));
  expect(scene.inject).toHaveBeenCalledWith(expect.stringContaining('"revision":2'));
});
it("suspends deadlines and sends only the latest model when the scene becomes active", async () => {
  vi.useFakeTimers(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); scene.active = false;
  const fail = vi.fn(), props = { model: { lanes: [], revision: 1 } as never, onSelect: vi.fn(), onPan: vi.fn(), onUnavailable: fail };
  await act(async () => { renderer = create(createElement(Arena3D, props)); });
  await act(async () => { vi.advanceTimersByTime(60_000); }); expect(fail).not.toHaveBeenCalled();
  await act(async () => renderer.root.findByType("WebView" as never).props.onMessage({ nativeEvent: { data: '{"type":"arena-ready"}' } }));
  expect(scene.inject).not.toHaveBeenCalled();
  scene.active = true;
  await act(async () => renderer.update(createElement(Arena3D, { ...props, model: { lanes: [], revision: 3 } as never })));
  await act(async () => { vi.advanceTimersByTime(80); });
  expect(scene.inject).toHaveBeenCalledOnce(); expect(scene.inject).toHaveBeenCalledWith(expect.stringContaining('"revision":3'));
});
