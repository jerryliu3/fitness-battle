import { createFieldOverlayHold } from "@fitness-battle/shared";

/** Observe the scene without taking pointer capture from its pan/zoom owner. */
export function bindFieldOverlayHold(surface: HTMLElement, onHiddenChange: (hidden: boolean) => void) {
  const hold = createFieldOverlayHold(onHiddenChange);
  const pointers = new Set<number>();
  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    if (!pointers.size) hold.reset();
    pointers.add(event.pointerId);
    if (pointers.size > 1) {
      hold.move(event.clientX, event.clientY, pointers.size);
    } else if (event.target instanceof Element && surface.contains(event.target) && !event.target.closest("button, a, input")) {
      hold.start(event.clientX, event.clientY);
    }
  };
  const move = (event: PointerEvent) => {
    if (pointers.has(event.pointerId)) hold.move(event.clientX, event.clientY, pointers.size);
  };
  const up = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    // Let the scene release capture and flush its camera, but consume its tap.
    if (hold.suppressSelection()) event.preventDefault();
    pointers.delete(event.pointerId);
    if (!pointers.size) hold.end();
  };
  const clear = () => { pointers.clear(); hold.reset(); };
  const lostCapture = (event: PointerEvent) => { if (pointers.has(event.pointerId)) clear(); };
  const visibility = () => { if (document.hidden) clear(); };
  const click = (event: MouseEvent) => {
    if (event.detail !== 0 && hold.suppressSelection()) { event.preventDefault(); event.stopPropagation(); }
  };
  const context = (event: MouseEvent) => { if (hold.suppressSelection()) event.preventDefault(); };
  window.addEventListener("pointerdown", down, { capture: true });
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up, { capture: true });
  window.addEventListener("pointercancel", up);
  window.addEventListener("lostpointercapture", lostCapture);
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", visibility);
  surface.addEventListener("click", click, { capture: true });
  surface.addEventListener("contextmenu", context);
  return () => {
    clear();
    window.removeEventListener("pointerdown", down, { capture: true });
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up, { capture: true });
    window.removeEventListener("pointercancel", up);
    window.removeEventListener("lostpointercapture", lostCapture);
    window.removeEventListener("blur", clear);
    document.removeEventListener("visibilitychange", visibility);
    surface.removeEventListener("click", click, { capture: true });
    surface.removeEventListener("contextmenu", context);
  };
}
