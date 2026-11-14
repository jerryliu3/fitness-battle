"use client";
import { useEffect, useRef, useState } from "react";

export function useChartTween<T>(
  target: T,
  transitionKey: string,
  interpolate: (from: T, to: T, t: number) => T,
  reducedMotion: boolean,
  durationMs = 280,
): T {
  const [displayed, setDisplayed] = useState(target);
  const displayedRef = useRef(displayed);
  displayedRef.current = displayed;
  const lastKeyRef = useRef(transitionKey);

  useEffect(() => {
    if (lastKeyRef.current === transitionKey) {
      setDisplayed(target);
      return;
    }
    const from = displayedRef.current;
    lastKeyRef.current = transitionKey;
    if (reducedMotion || typeof requestAnimationFrame !== "function") {
      setDisplayed(target);
      return;
    }
    const start = Date.now();
    let frame = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - (1 - p) ** 3;
      setDisplayed(p >= 1 ? target : interpolate(from, target, eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, transitionKey, interpolate, reducedMotion, durationMs]);

  return reducedMotion ? target : transitionKey === lastKeyRef.current ? displayed : displayedRef.current;
}
