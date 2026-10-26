import { createElement, Profiler } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { POLISHED_IDENTITY } from "@fitness-battle/shared";
import { LocalWake } from "./local-wake";
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });
it("keeps visibility and background changes outside React and cleans up its observer", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const listeners = new Map<string, () => void>();
  const doc = { hidden: false, addEventListener: (name: string, fn: () => void) => listeners.set(name, fn), removeEventListener: (name: string) => listeners.delete(name) };
  vi.stubGlobal("document", doc);
  const request = vi.fn(); vi.stubGlobal("requestAnimationFrame", request);
  let intersection: (entries: { isIntersecting: boolean }[]) => void = () => {};
  const disconnect = vi.fn(), observe = vi.fn();
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: typeof intersection) { intersection = callback; }
    observe = observe; disconnect = disconnect;
  });
  const node = { dataset: { paused: "true" }, closest: () => null };
  const render = vi.fn();
  await act(async () => { renderer = create(createElement(Profiler, { id: "wake", onRender: render }, createElement(LocalWake, { gold: true })), { createNodeMock: () => node }); });
  expect(renderer.root.findAllByType("g").filter(n => n.props.className === "field-local-echo")).toHaveLength(POLISHED_IDENTITY.echoes);
  expect(renderer.root.findAllByType("mask")).toHaveLength(2);
  const renders = render.mock.calls.length;
  await act(async () => intersection([{ isIntersecting: true }]));
  expect(node.dataset.paused).toBe("false");
  await act(async () => { doc.hidden = true; listeners.get("visibilitychange")?.(); });
  expect(node.dataset.paused).toBe("true");
  await act(async () => { doc.hidden = false; listeners.get("visibilitychange")?.(); });
  expect(node.dataset.paused).toBe("false");
  await act(async () => intersection([{ isIntersecting: false }]));
  expect(node.dataset.paused).toBe("true");
  expect(render).toHaveBeenCalledTimes(renders);
  expect(request).not.toHaveBeenCalled();
  await act(async () => renderer.unmount());
  expect(disconnect).toHaveBeenCalledOnce();
  expect(listeners.size).toBe(0);
});
