import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("./section", () => ({ AppText: "span" }));
vi.mock("@/lib/haptics", () => ({ playCue: vi.fn() }));
import { playCue } from "@/lib/haptics";
import { ChartScrubber } from "./chart-scrubber";

const points = [
  { id: "mon", x: 20, y: 90, label: "Monday", value: "1.0" },
  { id: "tue", x: 80, y: 30, label: "Tuesday", value: "3.0" },
];
const target = { getBoundingClientRect: () => ({ left: 100, width: 300 }), setPointerCapture: vi.fn(), hasPointerCapture: () => false, releasePointerCapture: vi.fn() };
const event = (x: number, y = 100) => ({ clientX: x, clientY: y, pointerId: 1, pointerType: "mouse", currentTarget: target });
let renderer: ReactTestRenderer;
async function mount() {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await act(async () => { renderer = create(createElement(ChartScrubber, {
    points, width: 100, height: 120, plotTop: 10, plotBottom: 100, label: "Hours", children: null,
    renderSummary: point => point ? `${point.label}: ${point.value}` : "Weekly total",
  }), { createNodeMock: element => (element.props as { className?: string }).className === "chart-scrubber-surface" ? target : null }); });
}
const surface = () => renderer.root.findByProps({ role: "slider" });
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.clearAllMocks(); vi.unstubAllGlobals(); });

it("previews on hover without haptics and restores the summary on mouse leave", async () => {
  await mount();
  await act(async () => surface().props.onPointerMove(event(340)));
  expect(surface().props["aria-valuetext"]).toBe("Tuesday, 3.0");
  expect(playCue).not.toHaveBeenCalled();
  await act(async () => surface().props.onPointerLeave(event(340)));
  expect(JSON.stringify(renderer.toJSON())).toContain("Weekly total");
  expect(renderer.root.findAllByProps({ className: "chart-scrubber-marker" })).toHaveLength(0);
});

it("pins a stationary tap and supports arrow, first/last, and Escape keys", async () => {
  await mount();
  await act(async () => { surface().props.onPointerDown(event(160)); surface().props.onPointerUp(event(160)); });
  expect(surface().props["aria-valuetext"]).toBe("Monday, 1.0");
  await act(async () => surface().props.onPointerLeave(event(160)));
  expect(surface().props["aria-valuetext"]).toBe("Monday, 1.0");
  for (const [key, expected] of [["ArrowRight", "Tuesday, 3.0"], ["Home", "Monday, 1.0"], ["End", "Tuesday, 3.0"]]) {
    await act(async () => surface().props.onKeyDown({ key, preventDefault() {} }));
    expect(surface().props["aria-valuetext"]).toBe(expected);
  }
  await act(async () => surface().props.onKeyDown({ key: "Escape", preventDefault() {} }));
  expect(JSON.stringify(renderer.toJSON())).toContain("Weekly total");
});

it("scrubs only horizontally and does not select a day after vertical scrolling or cancellation", async () => {
  await mount();
  await act(async () => { surface().props.onPointerDown(event(160)); surface().props.onPointerMove(event(340)); surface().props.onPointerUp(event(340)); });
  expect(surface().props["aria-valuetext"]).toBe("Tuesday, 3.0");
  await act(async () => { surface().props.onPointerDown(event(160)); surface().props.onPointerMove(event(162, 140)); surface().props.onPointerUp(event(162, 140)); });
  expect(JSON.stringify(renderer.toJSON())).toContain("Weekly total");
  await act(async () => { surface().props.onPointerDown(event(160)); surface().props.onPointerMove(event(340)); surface().props.onPointerCancel(event(340)); });
  expect(JSON.stringify(renderer.toJSON())).toContain("Weekly total");
});
