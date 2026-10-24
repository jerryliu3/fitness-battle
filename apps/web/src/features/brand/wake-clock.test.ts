import { createElement, useRef } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { usePolishedWakeTime } from "./polished-racer";
let renderer: ReactTestRenderer;
function Probe({ enabled }: { enabled: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  usePolishedWakeTime(host, enabled);
  return null;
}
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });
it("keeps ordinary fields idle and stops frame work when exploration closes", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const frame = vi.fn(() => 1), cancel = vi.fn();
  vi.stubGlobal("requestAnimationFrame", frame); vi.stubGlobal("cancelAnimationFrame", cancel);
  vi.stubGlobal("IntersectionObserver", undefined);
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  vi.stubGlobal("document", { hidden: false, addEventListener() {}, removeEventListener() {} });
  await act(async () => { renderer = create(createElement(Probe, { enabled: false })); });
  expect(frame).not.toHaveBeenCalled();
  await act(async () => renderer.update(createElement(Probe, { enabled: true })));
  expect(frame).toHaveBeenCalledTimes(1);
  const count = frame.mock.calls.length;
  await act(async () => renderer.update(createElement(Probe, { enabled: false })));
  expect(cancel).toHaveBeenCalledWith(1);
  expect(frame).toHaveBeenCalledTimes(count);
});
