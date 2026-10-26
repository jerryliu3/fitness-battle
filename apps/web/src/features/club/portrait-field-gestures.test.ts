import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { useFieldGestures } from "../field/use-field-gestures";
const binding = vi.hoisted(() => ({ options: null as Parameters<typeof useFieldGestures>[0] | null }));
vi.mock("../field/use-field-gestures", () => ({ useFieldGestures: (options: Parameters<typeof useFieldGestures>[0]) => { binding.options = options; return {}; } }));
import { PortraitField } from "./portrait-field";

afterEach(() => vi.unstubAllGlobals());
it("maps the same world-space drag identically through letterboxing and display scaling", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("DOMPoint", class {
    constructor(public x: number, public y: number) {}
    matrixTransform(matrix: { scale: number; left: number; top: number }) { return { x: (this.x - matrix.left) / matrix.scale, y: (this.y - matrix.top) / matrix.scale }; }
  });
  const results = [];
  for (const transform of [{ scale: 1, left: 0, top: 0 }, { scale: 2, left: 100, top: 200 }]) {
    const change = vi.fn();
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(createElement(PortraitField, {
        lanes: [{ id: "a", name: "A", initials: "A", value: 10 }, { id: "you", name: "You", initials: "Y", value: 10, you: true }, { id: "b", name: "B", initials: "B", value: 10 }],
        view: { center: 10, span: 2 }, unit: "km", immersive: true, onViewChange: change, onPan() {}, onZoom() {}, onSelect() {},
      }), { createNodeMock: element => element.type === "svg" ? { getScreenCTM: () => ({ inverse: () => transform }) } : null });
    });
    await act(async () => {
      binding.options!.onMove({ from: { x: 210 * transform.scale + transform.left, y: 400 * transform.scale + transform.top }, to: { x: 240 * transform.scale + transform.left, y: 420 * transform.scale + transform.top }, view: { center: 10, span: 2 }, span: 2, lateral: 1, pinching: false });
    });
    results.push({ center: change.mock.lastCall![0].center, focus: binding.options!.lateral() });
    await act(async () => renderer.unmount());
  }
  expect(results[0]!.center).toBeGreaterThan(10);
  expect(results[0]!.focus).toBeLessThan(1);
  expect(results[1]!.center).toBeCloseTo(results[0]!.center);
  expect(results[1]!.focus).toBeCloseTo(results[0]!.focus);
});
