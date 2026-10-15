"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** Magic UI-style count. Reduced motion snaps to the value. */
export function NumberTicker({ value, digits = 0 }: { value: number; digits?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    if (reduce) {
      from.current = value;
      setShown(value);
      return;
    }
    const startValue = from.current;
    const started = performance.now();
    const factor = 10 ** digits;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / 420);
      const next = Math.round((startValue + (value - startValue) * t) * factor) / factor;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [digits, reduce, value]);

  return <span>{shown.toFixed(digits)}</span>;
}
