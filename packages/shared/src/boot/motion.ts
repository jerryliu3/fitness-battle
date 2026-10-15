export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};

/**
 * Wall-clock length: long ready while Ember morphs into a K, then a snappy pass.
 * ~1.15s ready + ~0.2s zoom + short settle.
 */
export const BOOT_DURATION_MS = 1600;

/** Hold / K-morph window — most of the beat. */
export const READY_END = 0.72;
/** Finish the letter pass quickly; remainder is a hard stop on OVERTAEK. */
export const ZOOM_END = 0.88;

/**
 * Boot-only travel curve. Shared overtake `frameAt` stays for the design study;
 * the product splash wants slow ready → fast zoom → stop.
 */
export function bootFrame(progress: number) {
  const p = clamp(progress);
  let travel = 0;
  if (p >= READY_END && p < ZOOM_END) {
    const t = (p - READY_END) / (ZOOM_END - READY_END);
    // Sharp accelerate into the pass, then ease into the stop.
    travel = t < 0.55 ? (t / 0.55) ** 1.55 * 0.72 : 0.72 + smooth((t - 0.55) / 0.45) * 0.28;
  } else if (p >= ZOOM_END) {
    travel = 1;
  }
  // Soft pullback late in ready, once the K pose has mostly landed.
  const windup =
    p > READY_END * 0.55 && p < READY_END
      ? -Math.sin(((p - READY_END * 0.55) / (READY_END * 0.45)) * Math.PI)
      : 0;
  return {
    travel,
    eShift: smooth(Math.max(0, (travel - 0.08) / 0.85)),
    /** Tiny hop only — this is a zoom, not a leap. */
    lift: Math.sin(travel * Math.PI) * 0.22,
    windup,
    phase: p >= 1 || p >= ZOOM_END ? "OVERTAEK" : p < READY_END ? "Ready" : "Zoom",
  };
}

/** Map boot progress onto the dash clip: idle/windup while ready, burst while zooming. */
export function bootDashProgress(progress: number) {
  const p = clamp(progress);
  if (p < READY_END) return (p / READY_END) * 0.22;
  if (p < ZOOM_END) return 0.22 + ((p - READY_END) / (ZOOM_END - READY_END)) * 0.54;
  return 0.76 + ((p - ZOOM_END) / (1 - ZOOM_END)) * 0.24;
}

/**
 * How far Ember has morphed from standing rest into a K-like arm silhouette.
 * Completes before the zoom so the jump reads as an already-formed K.
 */
export function bootKMorph(progress: number): number {
  const p = clamp(progress);
  const start = 0.05;
  const end = READY_END * 0.88;
  if (p <= start) return 0;
  if (p >= end) return 1;
  return smooth((p - start) / (end - start));
}
