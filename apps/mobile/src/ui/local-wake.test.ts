import { createElement, Profiler, useEffect, useRef } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { POLISHED_IDENTITY, polishedEchoPose, polishedWakeDuration } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ reduced: false, appState: "active", listener: null as null | ((state: string) => void), repeat: vi.fn(() => 0), cancel: vi.fn(), phase: null as null | { value: number } }));
vi.mock("react-native", () => ({ View: "View", Platform: { OS: "ios" }, AppState: { get currentState() { return mock.appState; }, addEventListener: (_name: string, listener: (state: string) => void) => { mock.listener = listener; return { remove: () => { mock.listener = null; } }; } } }));
vi.mock("expo-router", () => ({ useFocusEffect: (callback: () => () => void) => useEffect(callback, [callback]) }));
vi.mock("react-native-svg", () => Object.fromEntries(["default", "G", "Path", "Rect", "Defs", "ClipPath", "LinearGradient", "Stop", "Mask"].map(key => [key, `Svg${key}`])));
vi.mock("./use-reduced-motion", () => ({ useReducedMotion: () => mock.reduced }));
vi.mock("react-native-reanimated", () => ({
  default: { createAnimatedComponent: () => "AnimatedG" },
  Easing: { linear: (value: number) => value },
  useSharedValue: () => { const value = useRef({ value: 0 }); mock.phase = value.current; return value.current; },
  useAnimatedProps: (updater: () => object) => updater,
  withRepeat: mock.repeat, withTiming: (value: number) => value, cancelAnimation: mock.cancel,
}));
import { LocalWake } from "./local-wake";
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); vi.clearAllMocks(); mock.reduced = false; });
it.each([false, true])("preserves original echo poses without React frame commits for gold=%s and suspends in background", async gold => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const request = vi.fn(); vi.stubGlobal("requestAnimationFrame", request);
  const render = vi.fn();
  await act(async () => { renderer = create(createElement(Profiler, { id: "wake", onRender: render }, createElement(LocalWake, { gold, x: 120, y: 200, angle: 0, scale: 1 }))); });
  const echoes = renderer.root.findAllByType("AnimatedG" as never);
  expect(echoes).toHaveLength(POLISHED_IDENTITY.echoes);
  expect(mock.repeat).toHaveBeenCalledOnce();
  const commits = render.mock.calls.length;
  mock.phase!.value = .2;
  const start = echoes[0].props.animatedProps();
  mock.phase!.value = .5;
  const next = echoes[0].props.animatedProps();
  expect(next.matrix[5]).toBeGreaterThan(start.matrix[5]);
  for (const t of [0, .2, .5, .95]) {
    mock.phase!.value = t;
    echoes.forEach((echo, index) => {
      const props = echo.props.animatedProps();
      const original = polishedEchoPose(gold, index, t * polishedWakeDuration(gold));
      expect(props.matrix[5]).toBeCloseTo(original.offset);
      expect(props.opacity).toBeCloseTo(original.opacity);
    });
  }
  expect(render).toHaveBeenCalledTimes(commits);
  expect(request).not.toHaveBeenCalled();
  const updater = echoes[0].props.animatedProps;
  await act(async () => renderer.update(createElement(Profiler, { id: "wake", onRender: render }, createElement(LocalWake, { gold, x: 240, y: 300, angle: 12, scale: 2 }))));
  expect(renderer.root.findAllByType("AnimatedG" as never)[0].props.animatedProps).toBe(updater);
  expect(mock.repeat).toHaveBeenCalledOnce();
  await act(async () => mock.listener?.("background"));
  expect(renderer.root.findAllByType("AnimatedG" as never)).toHaveLength(0);
  expect(mock.cancel).toHaveBeenCalled();
  await act(async () => mock.listener?.("active"));
  expect(renderer.root.findAllByType("AnimatedG" as never)).toHaveLength(POLISHED_IDENTITY.echoes);
  await act(async () => renderer.unmount());
  expect(mock.listener).toBeNull();
});
it("does not start animation under reduced motion", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); mock.reduced = true;
  await act(async () => { renderer = create(createElement(LocalWake, { gold: false, x: 120, y: 200, angle: 0, scale: 1 })); });
  expect(mock.repeat).not.toHaveBeenCalled();
  expect(renderer.root.findAllByType("AnimatedG" as never)).toHaveLength(0);
});
