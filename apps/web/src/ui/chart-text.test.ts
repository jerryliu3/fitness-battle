import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { ChartSvg, ChartText } from "./chart-text";

afterEach(() => vi.unstubAllGlobals());
it("keeps chart captions at their recipe size when the plot shrinks or stretches", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  let resize = () => {};
  vi.stubGlobal("ResizeObserver", class { constructor(callback: () => void) { resize = callback; } observe() {} disconnect() {} });
  let width = 170;
  let matrix = { a: .5, b: 0, c: 0, d: 2 };
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(createElement(ChartSvg, { viewBox: "0 0 340 150" }, createElement(ChartText, { x: 36, y: 20 }, "1140"), createElement(ChartText, { x: 185, y: 136, minChartWidth: 260 }, "Oct 9")), { createNodeMock: () => ({ getScreenCTM: () => matrix, getBoundingClientRect: () => ({ width }) }) }); });
  const text = () => renderer!.root.findAllByType("text")[0];
  expect(renderer!.root.findAllByType("text")).toHaveLength(1);
  expect(text().props.transform).toBe("translate(36 20) scale(2 0.5) translate(-36 -20)");
  expect(text().props.style.fontSize).toBe("0.75rem");
  width = 340;
  matrix = { a: 1, b: 0, c: 0, d: 1 };
  await act(async () => resize());
  expect(text().props.transform).toBe("translate(36 20) scale(1 1) translate(-36 -20)");
  expect(renderer!.root.findAllByType("text")).toHaveLength(2);
  await act(async () => renderer!.unmount());
});
