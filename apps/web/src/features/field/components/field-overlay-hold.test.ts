import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { bindFieldOverlayHold } from "./field-overlay-hold";

class ElementStub extends EventTarget {
  constructor(readonly inside = true, readonly control = false) { super(); }
  contains(target: ElementStub) { return target.inside; }
  closest() { return this.control ? this : null; }
}
let surface: ElementStub;
let changed: ReturnType<typeof vi.fn>;
let dispose: () => void;
function pointer(type: string, target = surface, id = 1, x = 10) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, "target", { value: target });
  Object.assign(event, { pointerId: id, button: 0, clientX: x, clientY: 20 });
  window.dispatchEvent(event);
  return event;
}
function click(detail = 1) {
  const event = new Event("click", { cancelable: true });
  Object.assign(event, { detail });
  surface.dispatchEvent(event);
  return event;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("document", Object.assign(new EventTarget(), { hidden: false }));
  vi.stubGlobal("Element", ElementStub);
  surface = new ElementStub();
  changed = vi.fn();
  dispose = bindFieldOverlayHold(surface as unknown as HTMLElement, changed);
});
afterEach(() => { dispose(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it("consumes the held release and delayed click, then accepts a fresh scene or HUD press", () => {
  pointer("pointerdown");
  vi.advanceTimersByTime(450);
  expect(changed).toHaveBeenLastCalledWith(true);
  expect(pointer("pointerup").defaultPrevented).toBe(true);
  expect(changed).toHaveBeenLastCalledWith(false);
  vi.advanceTimersByTime(500);
  expect(click().defaultPrevented).toBe(true);
  expect(click(0).defaultPrevented).toBe(false);
  pointer("pointerdown", new ElementStub(false, true));
  expect(pointer("pointerup").defaultPrevented).toBe(false);
  expect(click().defaultPrevented).toBe(false);
  pointer("pointerdown"); pointer("pointerup");
  expect(click().defaultPrevented).toBe(false);
});
it("does not start a hold on controls or keep one pending during drags or pinches", () => {
  pointer("pointerdown", new ElementStub(true, true));
  vi.advanceTimersByTime(500);
  pointer("pointerup");
  pointer("pointerdown"); pointer("pointermove", surface, 1, 14);
  vi.advanceTimersByTime(500);
  pointer("pointerup");
  pointer("pointerdown"); pointer("pointerdown", new ElementStub(false), 2);
  vi.advanceTimersByTime(500);
  pointer("pointerup", surface, 2); pointer("pointerup");
  expect(changed).not.toHaveBeenCalled();
});
it("restores overlays after lost capture, tab backgrounding, blur or disposal", () => {
  for (const cancel of [
    () => pointer("lostpointercapture"),
    () => { Object.assign(document, { hidden: true }); document.dispatchEvent(new Event("visibilitychange")); },
    () => window.dispatchEvent(new Event("blur")),
    () => dispose(),
  ]) {
    pointer("pointerdown");
    vi.advanceTimersByTime(450);
    expect(changed).toHaveBeenLastCalledWith(true);
    cancel();
    expect(changed).toHaveBeenLastCalledWith(false);
    expect(click().defaultPrevented).toBe(false);
  }
  pointer("pointerdown");
  vi.advanceTimersByTime(500);
  expect(changed).toHaveBeenCalledTimes(8);
});
