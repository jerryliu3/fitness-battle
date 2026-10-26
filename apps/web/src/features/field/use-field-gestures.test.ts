import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { useFieldGestures, type FieldGestureFrame } from "./use-field-gestures";

let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });
it("accepts the secondary pointer and rebases at the displayed zoom after a finger lifts", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let frame: (() => void) | null = null;
  const schedule = vi.fn((fn: () => void) => { frame = fn; return 1; });
  vi.stubGlobal("requestAnimationFrame", schedule); vi.stubGlobal("cancelAnimationFrame", () => { frame = null; });
  const tap = vi.fn(), move = vi.fn((g: FieldGestureFrame) => ({ view: { center: g.view.center + (g.to.y - g.from.y) / 100, span: g.span }, lateral: g.lateral + g.to.x - g.from.x }));
  function Probe() { return createElement("svg", useFieldGestures({ view: { center: 10, span: 2 }, unit: "km", enabled: true, lateral: () => 0, onMove: move, onTap: tap })); }
  await act(async () => { renderer = create(createElement(Probe)); });
  const handlers = () => renderer.root.findByType("svg").props;
  const target = { setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn() };
  const point = (id: number, x: number, y: number) => ({ pointerId: id, isPrimary: id === 1, pointerType: "touch", button: 0, clientX: x, clientY: y, currentTarget: target, target: { id: "athlete" } });
  handlers().onPointerDown(point(1, 100, 200)); handlers().onPointerDown(point(2, 200, 200));
  handlers().onPointerMove(point(2, 250, 200)); handlers().onPointerMove(point(2, 300, 200));
  expect(schedule).toHaveBeenCalledTimes(1);
  await act(async () => { const fn = frame; frame = null; fn?.(); });
  expect(move.mock.lastCall![0].span).toBe(1);
  handlers().onPointerUp(point(2, 300, 200));
  handlers().onPointerMove(point(1, 100, 220));
  await act(async () => { const fn = frame; frame = null; fn?.(); });
  expect(move.mock.lastCall![0].view.span).toBe(1);
  expect(move.mock.lastCall![0].from).toEqual({ x: 100, y: 200 });
  handlers().onPointerUp(point(1, 100, 220)); expect(tap).not.toHaveBeenCalled();
  const down = point(1, 100, 200);
  handlers().onPointerDown(down); handlers().onPointerUp(point(1, 100, 200));
  expect(tap.mock.lastCall![1]).toBe(down.target);
  // A fullscreen hold consumes the release tap while still releasing capture.
  tap.mockClear();
  handlers().onPointerDown(point(1, 100, 200));
  handlers().onPointerUp({ ...point(1, 100, 200), defaultPrevented: true });
  expect(tap).not.toHaveBeenCalled();
  expect(target.releasePointerCapture).toHaveBeenCalled();
  handlers().onPointerDown(point(1, 100, 200));
  handlers().onPointerUp(point(1, 100, 200));
  expect(tap).toHaveBeenCalledTimes(1);
});
