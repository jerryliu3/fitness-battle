import { useEffect, useRef } from "react";
import { fieldFlightDuration, fieldFlightEase, type ArenaViewWindow } from "@fitness-battle/shared";

/** Retarget from the last displayed frame; direct manipulation always wins. */
export function useFieldFlight(view: ArenaViewWindow, apply: (view: ArenaViewWindow) => void, reduced: boolean) {
  const current = useRef(view);
  current.current = view;
  const latest = useRef(apply);
  latest.current = apply;
  const frame = useRef<number | null>(null);
  const cancel = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };
  useEffect(() => cancel, []);
  const fly = (target: ArenaViewWindow) => {
    cancel();
    const from = current.current, started = Date.now();
    const duration = fieldFlightDuration(from, target);
    if (reduced) { current.current = target; latest.current(target); return; }
    const tick = () => {
      const t = Math.min(1, (Date.now() - started) / duration), eased = fieldFlightEase(t);
      const next = { center: from.center + (target.center - from.center) * eased, span: from.span * Math.pow(target.span / from.span, eased) };
      current.current = next;
      latest.current(next);
      frame.current = t < 1 ? requestAnimationFrame(tick) : null;
    };
    frame.current = requestAnimationFrame(tick);
  };
  return { fly, cancel };
}
