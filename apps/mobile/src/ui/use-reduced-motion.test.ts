import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ read: vi.fn(), change: null as null | ((value: boolean) => void), remove: vi.fn() }));
vi.mock("react-native", () => ({ AccessibilityInfo: {
  isReduceMotionEnabled: mock.read,
  addEventListener: (_: string, callback: (value: boolean) => void) => { mock.change = callback; return { remove: mock.remove }; },
} }));
import { useReducedMotion } from "./use-reduced-motion";
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });
describe("native reduced motion", () => {
  it("starts still and does not let a stale preference read override a device change", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    let resolve!: (value: boolean) => void;
    mock.read.mockReturnValue(new Promise<boolean>((done) => { resolve = done; }));
    let reduced = false;
    function Probe() { reduced = useReducedMotion(); return null; }
    await act(async () => { renderer = create(createElement(Probe)); });
    expect(reduced).toBe(true);
    await act(async () => { mock.change?.(true); resolve(false); });
    expect(reduced).toBe(true);
    await act(async () => mock.change?.(false));
    expect(reduced).toBe(false);
    await act(async () => renderer.unmount());
    expect(mock.remove).toHaveBeenCalled();
  });
});
