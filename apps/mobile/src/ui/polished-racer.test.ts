import { createElement, Profiler, useEffect, useRef } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { POLISHED_IDENTITY, polishedEchoPose, polishedWakeDuration } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ reduced: false, appState: "active", listener: null as null | ((state: string) => void), repeat: vi.fn(() => 0), cancel: vi.fn(), phases: [] as { value: number }[] }));
vi.mock("react-native", () => ({ View: "View", Platform: { OS: "ios" }, AppState: { get currentState() { return mock.appState; }, addEventListener: (_name: string, listener: (state: string) => void) => { mock.listener = listener; return { remove: () => { mock.listener = null; } }; } } }));
vi.mock("expo-router", () => ({ useFocusEffect: (callback: () => () => void) => useEffect(callback, [callback]) }));
vi.mock("react-native-svg", () => Object.fromEntries(["default", "G", "Path", "Rect", "Defs", "ClipPath", "LinearGradient", "Stop", "Mask"].map(key => [key, `Svg${key}`])));
vi.mock("./use-reduced-motion", () => ({ useReducedMotion: () => mock.reduced }));
vi.mock("react-native-reanimated", () => ({
  default: { createAnimatedComponent: () => "AnimatedG" },
  Easing: { linear: (value: number) => value },
  useSharedValue: () => { const value = useRef<{ value: number } | null>(null); if (!value.current) { value.current = { value: 0 }; mock.phases.push(value.current); } return value.current; },
  useAnimatedProps: (updater: () => object) => updater,
  withRepeat: mock.repeat, withTiming: (value: number) => value, cancelAnimation: mock.cancel,
}));
import { PolishedRacer } from "./polished-racer";
import { useWakeAnimation } from "./use-wake-animation";
function Field({ gold, x = 120 }: { gold: boolean; x?: number }) {
  const animation = useWakeAnimation(true);
  return createElement("Svg", {}, createElement(PolishedRacer, { gold, you: true, x, y: 200, sizeScale: 1, animation }));
}
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); vi.clearAllMocks(); mock.reduced = false; mock.phases = []; });
it.each([false, true])("preserves original echo poses without React frame commits for gold=%s and suspends in background", async gold => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const request = vi.fn(); vi.stubGlobal("requestAnimationFrame", request);
  const render = vi.fn();
  await act(async () => { renderer = create(createElement(Profiler, { id: "wake", onRender: render }, createElement(Field, { gold }))); });
  const echoes = renderer.root.findAllByType("AnimatedG" as never);
  expect(echoes).toHaveLength(POLISHED_IDENTITY.echoes);
  expect(mock.repeat).toHaveBeenCalledTimes(2);
  expect(renderer.root.findAllByType("Svg" as never)).toHaveLength(1);
  const commits = render.mock.calls.length;
  mock.phases[gold ? 0 : 1].value = .2;
  const start = echoes[0].props.animatedProps();
  mock.phases[gold ? 0 : 1].value = .5;
  const next = echoes[0].props.animatedProps();
  expect(next.matrix[5]).toBeGreaterThan(start.matrix[5]);
  for (const t of [0, .2, .5, .95]) {
    mock.phases[gold ? 0 : 1].value = t;
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
  await act(async () => renderer.update(createElement(Profiler, { id: "wake", onRender: render }, createElement(Field, { gold, x: 240 }))));
  expect(renderer.root.findAllByType("AnimatedG" as never)[0].props.animatedProps).toBe(updater);
  expect(mock.repeat).toHaveBeenCalledTimes(2);
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
  await act(async () => { renderer = create(createElement(Field, { gold: false })); });
  expect(mock.repeat).not.toHaveBeenCalled();
  expect(renderer.root.findAllByType("AnimatedG" as never)).toHaveLength(0);
});
