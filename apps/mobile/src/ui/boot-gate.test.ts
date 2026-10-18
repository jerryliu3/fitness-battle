import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement, useEffect } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
const mock = vi.hoisted(() => ({
  state: null as unknown,
  complete: null as null | (() => void),
}));
vi.mock("../lib/compete-store", () => ({
  useCompeteStore: () => ({ state: mock.state }),
}));
vi.mock("./boot-splash", () => ({
  BootSplash: ({
    onAnimationComplete,
  }: {
    onAnimationComplete: () => void;
  }) => {
    mock.complete = onAnimationComplete;
    return null;
  },
}));
import { BootGate } from "./boot-gate";
let renderer: ReactTestRenderer;
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("native boot gate", () => {
  it("keeps the navigator mounted during account reloads after the first launch", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mock.state = {};
    let mounts = 0;
    function Navigator() {
      useEffect(() => {
        mounts++;
      }, []);
      return null;
    }
    const tree = () => createElement(BootGate, null, createElement(Navigator));
    await act(async () => {
      renderer = create(tree());
    });
    await act(async () => {
      mock.complete?.();
    });
    expect(mounts).toBe(1);
    mock.state = null;
    await act(async () => {
      renderer.update(tree());
    });
    mock.state = {};
    await act(async () => {
      renderer.update(tree());
    });
    expect(mounts).toBe(1);
  });
  it("releases a stalled splash after its deadline without skipping initial data hydration", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mock.state = null;
    let mounts = 0;
    function Navigator() {
      useEffect(() => {
        mounts++;
      }, []);
      return null;
    }
    const tree = () => createElement(BootGate, null, createElement(Navigator));
    await act(async () => {
      renderer = create(tree());
      await vi.advanceTimersByTimeAsync(8500);
    });
    expect(mounts).toBe(0);
    mock.state = {};
    await act(async () => {
      renderer.update(tree());
    });
    // Effects are scheduled after create commits; flush the deadline if the initial act deferred it.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8500);
    });
    expect(mounts).toBe(1);
  });
});
