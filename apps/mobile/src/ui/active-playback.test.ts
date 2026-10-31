import { afterEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ currentState: "active", change: null as null | ((s: string) => void), remove: vi.fn() }));
vi.mock("react-native", () => ({ AppState: {
  get currentState() { return state.currentState; },
  addEventListener: (_: string, fn: (s: string) => void) => { state.change = fn; return { remove: state.remove }; },
} }));
import { startActivePlayback } from "./active-playback";
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); state.currentState = "active"; vi.clearAllMocks(); });
it("pauses immediately, excludes suspended time, and never publishes after cleanup", () => {
  vi.useFakeTimers(); vi.setSystemTime(0);
  const frames = new Map<number, () => void>(); let id = 0;
  vi.stubGlobal("requestAnimationFrame", (fn: () => void) => { frames.set(++id, fn); return id; });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  const tick = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); };
  const publish = vi.fn(); const stop = startActivePlayback(1000, publish);
  vi.setSystemTime(250); tick(); expect(publish).toHaveBeenLastCalledWith(.25);
  state.currentState = "inactive"; state.change!("inactive"); expect(frames.size).toBe(0);
  state.currentState = "background"; state.change!("background");
  vi.setSystemTime(60_250); state.currentState = "active"; state.change!("active");
  vi.setSystemTime(60_500); tick(); expect(publish).toHaveBeenLastCalledWith(.5);
  vi.setSystemTime(61_000); tick(); expect(publish).toHaveBeenLastCalledWith(1); expect(frames.size).toBe(0);
  const calls = publish.mock.calls.length; stop(); state.change!("active"); tick();
  expect(publish).toHaveBeenCalledTimes(calls); expect(state.remove).toHaveBeenCalledOnce();
});
it("does not start while inactive, and cancels a pending frame on disposal", () => {
  state.currentState = "background";
  const request = vi.fn(() => 7), cancel = vi.fn();
  vi.stubGlobal("requestAnimationFrame", request); vi.stubGlobal("cancelAnimationFrame", cancel);
  const stop = startActivePlayback(1000, vi.fn()); expect(request).not.toHaveBeenCalled();
  state.currentState = "active"; state.change!("active"); expect(request).toHaveBeenCalledOnce();
  stop(); expect(cancel).toHaveBeenCalledWith(7);
});
it("publishes completion on return if inactivity began between the final two frames", () => {
  vi.useFakeTimers(); vi.setSystemTime(0);
  let tick!: () => void;
  vi.stubGlobal("requestAnimationFrame", (fn: () => void) => { tick = fn; return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const publish = vi.fn(), stop = startActivePlayback(1000, publish);
  vi.setSystemTime(990); tick(); expect(publish).toHaveBeenLastCalledWith(.99);
  vi.setSystemTime(1001); state.currentState = "inactive"; state.change!("inactive");
  expect(publish).toHaveBeenCalledTimes(1);
  vi.setSystemTime(60_000); state.currentState = "active"; state.change!("active");
  expect(publish).toHaveBeenLastCalledWith(1);
  state.change!("active"); expect(publish).toHaveBeenCalledTimes(2);
  stop();
});
