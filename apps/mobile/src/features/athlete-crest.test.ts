import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { athleteCardModel, freshState } from "@fitness-battle/shared";
const scene = vi.hoisted(() => ({ active: true, inject: vi.fn() }));
vi.mock("../ui/use-scene-active", () => ({ useSceneActive: () => scene.active }));
vi.mock("../theme", () => ({ useAppTheme: () => ({ mode: "light", colors: { paper: "white", muted: "gray" } }) }));
vi.mock("../ui/section", () => ({ AppText: "Text" }));
vi.mock("react-native", () => ({ ActivityIndicator: "ActivityIndicator", View: "View", Pressable: "Pressable" }));
vi.mock("../lib/env", () => ({ mobileEnv: { apiUrl: "https://example.test" } }));
vi.mock("react-native-webview", async () => {
  const { createElement, forwardRef, useImperativeHandle } = await import("react");
  return { default: forwardRef((props: Record<string, unknown>, ref) => { useImperativeHandle(ref, () => ({ injectJavaScript: scene.inject })); return createElement("WebView", props); }) };
});
import { AthleteCrest } from "./athlete-crest";
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); scene.active = true; vi.useRealTimers(); vi.clearAllMocks(); vi.unstubAllGlobals(); });
const model = athleteCardModel(freshState(new Date("2026-11-08T12:00:00Z")));
it("handshakes before sending data, pauses on blur and releases native scrolling", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const interaction = vi.fn();
  await act(async () => { renderer = create(createElement(AthleteCrest, { model, bundled: false, onInteractionChange: interaction })); });
  const web = renderer.root.findByType("WebView" as never);
  expect(web.props.source.uri).toBe("https://example.test/athlete-card-scene");
  expect(scene.inject).not.toHaveBeenCalled();
  await act(async () => web.props.onMessage({ nativeEvent: { data: '{"type":"athlete-card-ready"}' } }));
  expect(scene.inject).toHaveBeenCalledWith(expect.stringContaining('"active":true'));
  await act(async () => web.props.onTouchStart()); expect(interaction).toHaveBeenLastCalledWith(true);
  scene.active = false;
  await act(async () => renderer.update(createElement(AthleteCrest, { model: { ...model }, bundled: false, onInteractionChange: interaction })));
  expect(scene.inject).toHaveBeenLastCalledWith(expect.stringContaining('"active":false'));
  expect(interaction).toHaveBeenLastCalledWith(false);
});
it("shows a loading indicator until rendered, shows an error after termination, and ignores stale acknowledgements", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await act(async () => { renderer = create(createElement(AthleteCrest, { model: { ...model, score: 5000, rank: "Active" }, bundled: false })); });
  expect(renderer.root.findAllByType("ActivityIndicator" as never)).toHaveLength(1);
  const web = renderer.root.findByType("WebView" as never);
  expect(web.props.onShouldStartLoadWithRequest({ url: "https://example.test/athlete-card-scene-malicious" })).toBe(false);
  const staleMessage = web.props.onMessage;
  await act(async () => web.props.onContentProcessDidTerminate());
  await act(async () => staleMessage({ nativeEvent: { data: '{"type":"athlete-card-rendered"}' } }));
  expect(renderer.root.findAllByType("ActivityIndicator" as never)).toHaveLength(0);
  expect(renderer.root.findByType("Text" as never).props.children).toBe("Could not load your athlete card.");
  expect(renderer.root.findAllByType("WebView" as never)).toHaveLength(0);
  expect(renderer.root.findAllByType("Pressable" as never)).toHaveLength(0);
});

it("holds model updates during card interaction and sends only the latest change on release", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await act(async () => { renderer = create(createElement(AthleteCrest, { model })); });
  const web = () => renderer.root.findByType("WebView" as never);
  await act(async () => web().props.onMessage({ nativeEvent: { data: '{"type":"athlete-card-ready"}' } }));
  const sent = scene.inject.mock.calls.length;
  await act(async () => web().props.onTouchStart());
  await act(async () => renderer.update(createElement(AthleteCrest, { model: { ...model, name: "Taylor" } })));
  expect(scene.inject).toHaveBeenCalledTimes(sent);
  await act(async () => web().props.onTouchEnd());
  expect(scene.inject).toHaveBeenCalledTimes(sent + 1);
  expect(scene.inject).toHaveBeenLastCalledWith(expect.stringContaining('"name":"Taylor"'));
  await act(async () => web().props.onTouchEnd());
  expect(scene.inject).toHaveBeenCalledTimes(sent + 1);
});

it("keeps the full card scene interactive with a transparent background", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const interaction = vi.fn();
  await act(async () => { renderer = create(createElement(AthleteCrest, { model, transparent: true, onInteractionChange: interaction })); });
  const web = renderer.root.findByType("WebView" as never);
  expect(web.props.style).toMatchObject({ height: 430, backgroundColor: "transparent" });
  await act(async () => web.props.onMessage({ nativeEvent: { data: '{"type":"athlete-card-ready"}' } }));
  await act(async () => web.props.onTouchStart());
  expect(interaction).toHaveBeenLastCalledWith(true);
});

it("retains the portrait in the scene while updating the score in memory", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const portrait = { ...model, avatarUrl: "data:image/jpeg;base64,portrait-payload" };
  await act(async () => { renderer = create(createElement(AthleteCrest, { model: portrait })); });
  const web = renderer.root.findByType("WebView" as never);
  await act(async () => web.props.onMessage({ nativeEvent: { data: '{"type":"athlete-card-ready"}' } }));
  expect(scene.inject).toHaveBeenLastCalledWith(expect.stringContaining("portrait-payload"));
  await act(async () => renderer.update(createElement(AthleteCrest, { model: { ...portrait, score: 1250 } })));
  const update = scene.inject.mock.calls.at(-1)![0];
  expect(update).toContain('"score":1250');
  expect(update).not.toContain("portrait-payload");
});

it("resizes the existing WebView to its displayed height without reloading the scene", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await act(async () => { renderer = create(createElement(AthleteCrest, { model, height: 376.25 })); });
  const web = renderer.root.findByType("WebView" as never);
  await act(async () => web.props.onMessage({ nativeEvent: { data: '{"type":"athlete-card-ready"}' } }));
  await act(async () => web.props.onMessage({ nativeEvent: { data: '{"type":"athlete-card-rendered"}' } }));
  const sends = scene.inject.mock.calls.length;
  await act(async () => renderer.update(createElement(AthleteCrest, { model, height: 134.375 })));
  expect(renderer.root.findByType("WebView" as never)).toBe(web);
  expect(web.props.style).toMatchObject({ height: 134.375, opacity: 1 });
  expect(web.props.textZoom).toBe(100);
  expect(scene.inject).toHaveBeenCalledTimes(sends);
});

it("retries a failed retained scene on the next visit", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await act(async () => { renderer = create(createElement(AthleteCrest, { model })); });
  await act(async () => renderer.root.findByType("WebView" as never).props.onContentProcessDidTerminate());
  expect(renderer.root.findAllByType("WebView" as never)).toHaveLength(0);
  await act(async () => renderer.update(createElement(AthleteCrest, { model, active: false })));
  await act(async () => renderer.update(createElement(AthleteCrest, { model, active: true })));
  expect(renderer.root.findAllByType("WebView" as never)).toHaveLength(1);
});

it("loads the profile crest from the bundled scene by default without a server URL", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await act(async () => { renderer = create(createElement(AthleteCrest, { model })); });
  const web = renderer.root.findByType("WebView" as never);
  expect(web.props.source.uri).toBeUndefined();
  expect(web.props.source.html).toContain('id="root"');
  expect(renderer.root.findAllByType("ActivityIndicator" as never)).toHaveLength(1);
  expect(renderer.root.findAllByType("Text" as never)).toHaveLength(0);
  expect(web.props.onShouldStartLoadWithRequest({ url: "https://example.test/athlete-card-scene" })).toBe(false);
  await act(async () => web.props.onMessage({ nativeEvent: { data: '{"type":"athlete-card-ready"}' } }));
  await act(async () => web.props.onMessage({ nativeEvent: { data: '{"type":"athlete-card-rendered"}' } }));
  expect(renderer.root.findAllByType("ActivityIndicator" as never)).toHaveLength(0);
  await act(async () => web.props.onError());
  expect(renderer.root.findByType("Text" as never).props.children).toBe("Could not load your athlete card.");
});
