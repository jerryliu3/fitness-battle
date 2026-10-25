import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { LogoRaceBootSplash } from "./logo-race-boot-splash";
import { LOGO_RACE_DURATION_MS } from "@fitness-battle/shared/boot";
let renderer: ReactTestRenderer;
let hidden: boolean;
let reduced: boolean;
const listeners = new Map<string, () => void>();
beforeEach(() => {
  hidden = false; reduced = false; listeners.clear();
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (fn: (now: number) => void) => setTimeout(() => fn(Date.now()), 16));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  vi.stubGlobal("document", { get hidden() { return hidden; }, fonts: { ready: Promise.resolve() }, addEventListener: (event: string, fn: () => void) => listeners.set(event, fn), removeEventListener: (event: string) => listeners.delete(event) });
  vi.stubGlobal("matchMedia", () => ({ get matches() { return reduced; }, addEventListener: (event: string, fn: () => void) => listeners.set(event, fn), removeEventListener: (event: string) => listeners.delete(event) }));
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.useRealTimers(); vi.unstubAllGlobals();
});
async function advance(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
describe("web logo splash clock", () => {
  it("pauses while hidden and completes exactly once without changing the waiting mark", async () => {
    const complete = vi.fn();
    await act(async () => { renderer = create(createElement(LogoRaceBootSplash, { onAnimationComplete: complete })); });
    await advance(1000);
    hidden = true;
    await act(async () => { listeners.get("visibilitychange")?.(); });
    await advance(LOGO_RACE_DURATION_MS * 2);
    expect(complete).not.toHaveBeenCalled();
    hidden = false;
    await act(async () => { listeners.get("visibilitychange")?.(); });
    await advance(LOGO_RACE_DURATION_MS);
    expect(complete).toHaveBeenCalledTimes(1);
    await act(async () => { renderer.update(createElement(LogoRaceBootSplash, { onAnimationComplete: complete, waiting: true })); });
    expect(renderer.root.findAllByType("text").slice(-2).map(node => node.children)).toEqual([["over"], ["taek"]]);
    await advance(LOGO_RACE_DURATION_MS);
    expect(complete).toHaveBeenCalledTimes(1);
  });
  it("settles immediately for reduced motion", async () => {
    reduced = true;
    const complete = vi.fn();
    await act(async () => { renderer = create(createElement(LogoRaceBootSplash, { onAnimationComplete: complete })); });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(renderer.root.findAllByType("g").slice(-2).every(node => node.props.opacity === 1)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
