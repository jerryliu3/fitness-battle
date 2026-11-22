import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, useRef } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { LOGO_RACE_DURATION_MS } from "@fitness-battle/shared/boot";
const mock = vi.hoisted(() => ({
  active: true,
  reduced: false,
  listeners: new Map<string, (value?: boolean) => void>(),
  timers: new Set<ReturnType<typeof setTimeout>>(),
}));
vi.mock("react-native", () => ({useColorScheme: () => "light",
  View: "View", Text: "Text", ActivityIndicator: "Spinner", StyleSheet: { create: (styles: unknown) => styles }, useWindowDimensions: () => ({ width: 390 }),
  AppState: { get currentState() { return mock.active ? "active" : "background"; }, addEventListener: (name: string, fn: () => void) => { mock.listeners.set(name, fn); return { remove: () => mock.listeners.delete(name) }; } },
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(mock.reduced), addEventListener: (name: string, fn: () => void) => { mock.listeners.set(name, fn); return { remove: () => mock.listeners.delete(name) }; } },
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: "AnimatedView" },
  Easing: { linear: "linear" },
  ReduceMotion: { Never: "never" },
  useSharedValue: (value: number) => {
    const ref = useRef({ value });
    return ref.current;
  },
  useAnimatedStyle: (read: () => Record<string, unknown>) => read(),
  withTiming: (toValue: number, config?: { duration?: number }, callback?: (finished: boolean) => void) => {
    const duration = config?.duration ?? 0;
    const timer = setTimeout(() => {
      mock.timers.delete(timer);
      callback?.(true);
    }, duration);
    mock.timers.add(timer);
    return toValue;
  },
  cancelAnimation: () => {
    for (const timer of mock.timers) clearTimeout(timer);
    mock.timers.clear();
  },
}));
vi.mock("react-native-worklets", () => ({
  scheduleOnRN: (fn: (...args: unknown[]) => void, ...args: unknown[]) => fn(...args),
}));
vi.mock("react-native-svg", () => ({ default: "Svg", G: "G", Text: "SvgText" }));
import { LogoRaceBootSplash } from "./logo-race-boot-splash";
let renderer: ReactTestRenderer;
beforeEach(() => {
  mock.active = true; mock.reduced = false; mock.listeners.clear(); mock.timers.clear();
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  expect(mock.listeners.size).toBe(0);
  vi.useRealTimers(); vi.unstubAllGlobals();
});
async function advance(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
describe("native logo splash clock", () => {
  it("pauses in background and completes once, keeping the final wordmark while waiting", async () => {
    const complete = vi.fn();
    await act(async () => { renderer = create(createElement(LogoRaceBootSplash, { onAnimationComplete: complete })); });
    await advance(1000);
    mock.active = false;
    await act(async () => { mock.listeners.get("change")?.(); });
    await advance(LOGO_RACE_DURATION_MS * 2);
    expect(complete).not.toHaveBeenCalled();
    mock.active = true;
    await act(async () => { mock.listeners.get("change")?.(); });
    await advance(LOGO_RACE_DURATION_MS);
    expect(complete).toHaveBeenCalledTimes(1);
    await act(async () => { renderer.update(createElement(LogoRaceBootSplash, { onAnimationComplete: complete, waiting: true })); });
    expect(renderer.root.findAll(node => (node.type as unknown) === "SvgText").slice(-2).map(node => node.children)).toEqual([["over"], ["taek"]]);
    await advance(LOGO_RACE_DURATION_MS);
    expect(complete).toHaveBeenCalledTimes(1);
  });
  it("settles immediately when Reduce Motion becomes enabled", async () => {
    const complete = vi.fn();
    await act(async () => { renderer = create(createElement(LogoRaceBootSplash, { onAnimationComplete: complete })); });
    await advance(300);
    await act(async () => { mock.listeners.get("reduceMotionChanged")?.(true); });
    expect(complete).toHaveBeenCalledTimes(1);
    await act(async () => { renderer.update(createElement(LogoRaceBootSplash, { onAnimationComplete: complete, waiting: true })); });
    const layers = renderer.root.findAll(node => (node.type as unknown) === "AnimatedView");
    expect(layers.slice(-2).every(node => node.props.style[1].opacity === 1)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
