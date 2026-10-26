import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { useFieldFlight } from "./use-field-flight";

let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
it("retargets from the displayed frame and cancels travel on direct manipulation", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(0);
  const frames = new Map<number, () => void>(); let serial = 0;
  vi.stubGlobal("requestAnimationFrame", (fn: () => void) => { frames.set(++serial, fn); return serial; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  let flight!: ReturnType<typeof useFieldFlight>;
  const apply = vi.fn();
  function Probe() { flight = useFieldFlight({ center: 10, span: 2 }, apply, false); return null; }
  await act(async () => { renderer = create(createElement(Probe)); });
  const step = async (time: number) => { vi.setSystemTime(time); const work = [...frames.values()]; frames.clear(); await act(async () => work.forEach(fn => fn())); };
  flight.fly({ center: 30, span: 2 });
  expect(apply).not.toHaveBeenCalled();
  await step(300);
  const middle = apply.mock.lastCall![0].center;
  expect(middle).toBeGreaterThan(10); expect(middle).toBeLessThan(30);
  flight.fly({ center: 5, span: 2 });
  await step(301);
  expect(apply.mock.lastCall![0].center).toBeCloseTo(middle, 3);
  flight.cancel(); expect(frames.size).toBe(0);
  const calls = apply.mock.calls.length; await step(2000); expect(apply).toHaveBeenCalledTimes(calls);
});
