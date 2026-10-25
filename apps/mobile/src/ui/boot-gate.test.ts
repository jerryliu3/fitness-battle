import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, useEffect } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
const mock = vi.hoisted(() => ({ state: null as unknown, complete: null as null | (() => void) }));
vi.mock("../lib/compete-store", () => ({ useCompeteStore: () => ({ state: mock.state }) }));
vi.mock("react-native", () => ({ View: "View", StyleSheet: { absoluteFill: {} } }));
vi.mock("./boot-splash", () => ({ BootSplash: ({ onAnimationComplete }: { onAnimationComplete: () => void }) => {
  mock.complete = onAnimationComplete;
  return createElement("splash");
} }));
import { BootGate } from "./boot-gate";
import { useBootImage, useBootLoading } from "./boot-readiness";
let renderer: ReactTestRenderer;
let mounts: number;
function Screen({ loading = false }: { loading?: boolean }) {
  useBootLoading(loading);
  useEffect(() => { mounts++; }, []);
  return null;
}
const tree = (loading = false) => createElement(BootGate, null, createElement(Screen, { loading }));
const covered = () => renderer.root.findAll(node => (node.type as unknown) === "splash").length > 0;
async function layout() {
  await act(async () => { renderer.root.findAll(node => (node.type as unknown) === "View")[1].props.onLayout(); });
}
async function frames() { await act(async () => { await vi.advanceTimersByTimeAsync(50); }); }
beforeEach(() => {
  mounts = 0;
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (fn: () => void) => setTimeout(fn, 16));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("native boot gate", () => {
  it("mounts underneath the cover and waits for data, layout, requests and animation", async () => {
    mock.state = null;
    await act(async () => { renderer = create(tree(true)); });
    expect(mounts).toBe(1);
    await act(async () => { mock.complete?.(); });
    await layout();
    await frames();
    expect(covered()).toBe(true);
    mock.state = {};
    await act(async () => { renderer.update(tree(true)); });
    await frames();
    expect(covered()).toBe(true);
    await act(async () => { renderer.update(tree(false)); });
    await frames();
    expect(covered()).toBe(false);
    mock.state = null;
    await act(async () => { renderer.update(tree(true)); });
    expect(covered()).toBe(false);
    expect(mounts).toBe(1);
  });
  it("waits for native image load completion, including failed-image completion", async () => {
    mock.state = {};
    function ImageScreen() {
      const onLoadEnd = useBootImage("https://example.com/avatar.jpg");
      return createElement("image", { onLoadEnd });
    }
    await act(async () => { renderer = create(createElement(BootGate, null, createElement(ImageScreen))); });
    await layout();
    await act(async () => { mock.complete?.(); });
    await frames();
    expect(covered()).toBe(true);
    await act(async () => { renderer.root.find(node => (node.type as unknown) === "image").props.onLoadEnd(); });
    await frames();
    expect(covered()).toBe(false);
  });
  it("the animation deadline cannot bypass account hydration", async () => {
    mock.state = null;
    await act(async () => { renderer = create(tree()); });
    await layout();
    await act(async () => { await vi.advanceTimersByTimeAsync(8500); });
    expect(covered()).toBe(true);
    mock.state = {};
    await act(async () => { renderer.update(tree()); });
    await frames();
    expect(covered()).toBe(false);
  });
});
