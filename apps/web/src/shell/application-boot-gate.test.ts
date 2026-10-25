import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, useEffect } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { ApplicationBootGate } from "./application-boot-gate";
import { useBootLoading } from "./boot-readiness";
let renderer: ReactTestRenderer;
let mounts: number;
function Screen({ loading }: { loading: boolean }) {
  useBootLoading(loading);
  useEffect(() => { mounts++; }, []);
  return null;
}
const tree = (ready: boolean, loading = false) => createElement(ApplicationBootGate, {
  ready, splash: createElement("splash"), children: createElement(Screen, { loading }),
});
const covered = () => renderer.root.findAll(node => (node.type as unknown) === "splash").length > 0;
async function frames() { await act(async () => { await vi.advanceTimersByTimeAsync(50); }); }
beforeEach(() => {
  mounts = 0;
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (fn: () => void) => setTimeout(fn, 16));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  vi.stubGlobal("document", { fonts: { ready: Promise.resolve() } });
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("web application boot", () => {
  it("mounts screens beneath the splash and waits for account and screen requests", async () => {
    await act(async () => { renderer = create(tree(false, true)); });
    expect(mounts).toBe(1);
    await frames();
    expect(covered()).toBe(true);
    await act(async () => { renderer.update(tree(true, true)); });
    await frames();
    expect(covered()).toBe(true);
    await act(async () => { renderer.update(tree(true)); });
    await frames();
    expect(covered()).toBe(false);
    await act(async () => { renderer.update(tree(false, true)); });
    expect(covered()).toBe(false);
    expect(mounts).toBe(1);
  });
  it("waits for fonts and images; failed images also settle startup", async () => {
    let fontsReady!: () => void;
    vi.stubGlobal("document", { fonts: { ready: new Promise<void>(resolve => { fontsReady = resolve; }) } });
    const listeners = new Map<string, () => void>();
    const image = { complete: false, loading: "eager", addEventListener: (name: string, fn: () => void) => listeners.set(name, fn), removeEventListener: (name: string) => listeners.delete(name) };
    await act(async () => { renderer = create(tree(true), { createNodeMock: () => ({ querySelectorAll: () => [image] }) }); });
    await frames();
    expect(covered()).toBe(true);
    await act(async () => { fontsReady(); });
    await frames();
    expect(covered()).toBe(true);
    await act(async () => { listeners.get("error")?.(); });
    await frames();
    expect(covered()).toBe(false);
    expect(listeners.size).toBe(0);
  });
});
