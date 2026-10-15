"use client";

import { useEffect, useRef, useState } from "react";
import { EMBER_CLIPS, sampleEmber, type EmberAction } from "@fitness-battle/shared/mascot";

/** One bounded 30fps clock. Pauses while hidden/offscreen, and never catches up after resuming. */
export function useEmberPlayback({ action, playing = true, loop = true, speed = 1, restartKey = 0, motionOverride = false }: {
  action: EmberAction; playing?: boolean; loop?: boolean; speed?: number; restartKey?: number;
  /** Studio-only explicit opt-in. Product components always honor the system preference. */
  motionOverride?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);
  const [time, setTime] = useState(0);
  // Conservative initial state also makes SSR stable and avoids a flash before reading the preference.
  const [systemReducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const reducedMotion = systemReducedMotion !== false && !motionOverride;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let intersects = false;
    const update = () => setVisible(intersects && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { intersects = entry.isIntersecting; update(); });
    observer.observe(el); document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  useEffect(() => { elapsed.current = 0; setTime(0); }, [action, restartKey]);
  useEffect(() => {
    if (!playing || reducedMotion || !visible) return;
    let raf = 0, previous = 0, published = 0;
    const duration = EMBER_CLIPS[action].duration;
    const rate = Number.isFinite(speed) ? Math.max(0.1, Math.min(3, speed)) : 1;
    const tick = (now: number) => {
      if (previous) elapsed.current += Math.min(64, now - previous) * rate;
      previous = now;
      if (now - published >= 1000 / 30) {
        published = now; setTime(loop ? elapsed.current % duration : Math.min(duration, elapsed.current));
      }
      if (loop || elapsed.current < duration) raf = requestAnimationFrame(tick);
      else setTime(duration);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [action, loop, playing, reducedMotion, visible, speed, restartKey]);

  const seek = (next: number) => { elapsed.current = Math.max(0, Math.min(EMBER_CLIPS[action].duration, next)); setTime(elapsed.current); };
  return { hostRef, time, seek, reducedMotion, systemReducedMotion, pose: sampleEmber(action, time, { loop, reducedMotion }) };
}
