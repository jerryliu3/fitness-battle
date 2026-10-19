"use client";

import { useMotionValue, useMotionValueEvent } from "motion/react";
import { useEffect, useRef, useState } from "react";

function useAnimatedPoints(
  target: string,
  reduced: boolean,
): string {
  const motionPts = useMotionValue(target);
  const [shown, setShown] = useState(target);
  const prev = useRef(target);
  useMotionValueEvent(motionPts, "change", setShown);
  useEffect(() => {
    if (reduced || prev.current === target) {
      motionPts.set(target);
      prev.current = target;
      return;
    }
    const from = prev.current;
    prev.current = target;
    const fromPairs = from.split(" ").map((p) => p.split(",").map(Number));
    const toPairs = target.split(" ").map((p) => p.split(",").map(Number));
    const len = Math.max(fromPairs.length, toPairs.length);
    const start = performance.now();
    const duration = 480;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const parts: string[] = [];
      for (let i = 0; i < len; i++) {
        const a = fromPairs[i] ?? toPairs[i] ?? [0, 0];
        const b = toPairs[i] ?? fromPairs[i] ?? [0, 0];
        const x = a[0] + (b[0] - a[0]) * eased;
        const y = a[1] + (b[1] - a[1]) * eased;
        parts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
      motionPts.set(parts.join(" "));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced, motionPts]);
  return shown;
}

export function AnimatedPolyline({
  points,
  className,
  reduced,
}: {
  points: string;
  className?: string;
  reduced: boolean;
}) {
  const animated = useAnimatedPoints(points, reduced);
  return <polyline points={animated} className={className} />;
}

export function AnimatedPolygon({
  points,
  className,
  reduced,
}: {
  points: string;
  className?: string;
  reduced: boolean;
}) {
  const animated = useAnimatedPoints(points, reduced);
  return <polygon points={animated} className={className} />;
}
