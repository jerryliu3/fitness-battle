import { clamp, smooth } from "@/features/overtaek/motion";

/** Wall-clock length: brief ready, then a snappy pass. */
export const BOOT_DURATION_MS = 780;

/** Hold at the start while Ember winds up. */
const READY_END = 0.34;
/** Finish the letter pass; remainder is a hard stop on OVERTAEK. */
const ZOOM_END = 0.58;

/**
 * Boot-only travel curve. Shared overtake `frameAt` stays for the design study;
 * the product splash wants ready → zoom → stop, not a multi-second cruise.
 */
export function bootFrame(progress: number) {
  const p = clamp(progress);
  let travel = 0;
  if (p >= READY_END && p < ZOOM_END) {
    const t = (p - READY_END) / (ZOOM_END - READY_END);
    // Accelerate into the pass, then ease into the stop.
    travel = t < 0.55 ? (t / 0.55) ** 1.55 * 0.72 : 0.72 + smooth((t - 0.55) / 0.45) * 0.28;
  } else if (p >= ZOOM_END) {
    travel = 1;
  }
  const windup =
    p > 0.08 && p < READY_END ? -Math.sin(((p - 0.08) / (READY_END - 0.08)) * Math.PI) : 0;
  return {
    travel,
    eShift: smooth(Math.max(0, (travel - 0.08) / 0.85)),
    /** Tiny hop only — this is a zoom, not a leap. */
    lift: Math.sin(travel * Math.PI) * 0.22,
    windup,
    phase: p >= 1 || p >= ZOOM_END ? "OVERTAEK" : p < READY_END ? "Ready" : "Zoom",
  };
}

/** Map boot progress onto the dash clip: windup while ready, burst while zooming, rest after. */
export function bootDashProgress(progress: number) {
  const p = clamp(progress);
  if (p < READY_END) return (p / READY_END) * 0.24;
  if (p < ZOOM_END) return 0.24 + ((p - READY_END) / (ZOOM_END - READY_END)) * 0.52;
  return 0.76 + ((p - ZOOM_END) / (1 - ZOOM_END)) * 0.24;
}
