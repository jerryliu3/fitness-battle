import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as shared from "@fitness-battle/shared";

vi.mock("motion/react", () => ({ motion: { g: "motion.g" }, useReducedMotion: () => false }));
vi.mock("@/features/field/components/field-course", () => ({ drawFieldNode: () => null }));
vi.mock("@/features/brand/polished-racer", () => ({ PolishedRacer: "Racer" }));
import { ArenaLanes } from "./arena-lanes";

let renderer: ReactTestRenderer;
let callbacks: Map<number, FrameRequestCallback>;
let request: ReturnType<typeof vi.fn>;
const props = {
  lanes: [{ id: "me", name: "Me", initials: "ME", value: 3, you: true }],
  view: { center: 3, span: 1.2 }, unit: "km", selected: "me", immersive: true,
  onSelect: vi.fn(), onPan: vi.fn(),
};
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  callbacks = new Map();
  let id = 0;
  request = vi.fn((callback: FrameRequestCallback) => { callbacks.set(++id, callback); return id; });
  vi.stubGlobal("requestAnimationFrame", request);
  vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
async function mount(overrides = {}) {
  await act(async () => {
    renderer = create(createElement(ArenaLanes, { ...props, ...overrides }), {
      createNodeMock: () => ({ clientWidth: 390, clientHeight: 540, scrollLeft: 0, scrollTo() {}, addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ top: 0, left: 0, height: 540 }) }),
    });
  });
}
it("has no idle field clock and reuses scenery when only athlete values change", async () => {
  const scene = vi.spyOn(shared, "fieldCourseScene");
  await mount();
  const calls = scene.mock.calls.length;
  await act(async () => renderer.update(createElement(ArenaLanes, {
    ...props, lanes: [{ ...props.lanes[0], value: 3.1 }],
  })));
  expect(scene).toHaveBeenCalledTimes(calls);
  expect(request).not.toHaveBeenCalled();
  expect(renderer.root.findByType("Racer" as never).props.showWake).toBe(false);
});
it("uses the replay position immediately, without restarting marker easing", async () => {
  await mount({ playback: true });
  const marker = renderer.root.findAllByType("g").find(n => n.props["data-athlete"] === "me")!;
  const point = shared.fieldCourse(390, 540, 1, props.view, "km", shared.defaultFieldAppearance).point(3, 0, 0, true);
  expect(marker.props.transform).toBe(`translate(${point.x} ${point.y})`);
  expect(marker.props.animate).toBeUndefined();
});
it("coalesces pointer moves, flushes the last drag position, and cancels on unmount", async () => {
  const onPan = vi.fn();
  await mount({ onPan });
  const svg = renderer.root.findAllByType("svg").find(n => n.props.onPointerMove)!;
  const target = { getBoundingClientRect: () => ({ height: 540 }), setPointerCapture() {}, releasePointerCapture() {} };
  const event = (y: number) => ({ isPrimary: true, button: 0, pointerId: 1, pointerType: "mouse", clientX: 0, clientY: y, target: { closest: () => null }, currentTarget: target });
  await act(async () => {
    svg.props.onPointerDown(event(100));
    svg.props.onPointerMove(event(120));
    svg.props.onPointerMove(event(140));
    svg.props.onPointerMove(event(160));
  });
  expect(request).toHaveBeenCalledTimes(1);
  expect(onPan).not.toHaveBeenCalled();
  await act(async () => svg.props.onPointerUp(event(160)));
  expect(onPan).toHaveBeenCalledTimes(1);
  expect(onPan).toHaveBeenLastCalledWith(3 + 60 / 404 * 1.2);
  expect(callbacks.size).toBe(0);
  await act(async () => { svg.props.onPointerDown(event(100)); svg.props.onPointerMove(event(180)); });
  await act(async () => renderer.unmount());
  expect(callbacks.size).toBe(0);
});
