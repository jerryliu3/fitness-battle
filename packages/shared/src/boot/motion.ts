export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
export const smoother = (n: number) => {
  const t = clamp(n);
  return t * t * t * (t * (6 * t - 15) + 10);
};

/**
 * Wall-clock length: K wakes & morphs into Ember, flies a 3D banked loop
 * (behind OVERTA → around O → foreground slingshot overtake of E), then
 * morphs Ember's vector limbs back into the final K of OVERTAEK.
 */
export const BOOT_DURATION_MS = 3200;

/** Initial K → Ember un-morph + launch anticipation window. */
export const READY_END = 0.22;
/** Flight finishes; remainder is topological Ember → K morph settle. */
export const FLIGHT_END = 0.82;
/** @deprecated alias — flight end is the old “zoom end”. */
export const ZOOM_END = FLIGHT_END;

export type BootFlightStyle = "orbit" | "figure8" | "sprint";

type PathKey = {
  /** 0–1 within the flight window. */
  t: number;
  /**
   * Horizontal slot: 0 = home in the K slot, -1 = left edge of OVERTA / around O,
   * +1 = final seat after E.
   */
  nx: number;
  /** Vertical offset in em (negative = up, positive = down). */
  yEm: number;
  /** -1 behind letters, +1 in front. */
  depth: number;
};

/**
 * Uniformly-spaced (10% step) control keys for the 3 flight styles.
 * Uniform knot spacing guarantees C1 velocity continuity under Catmull-Rom.
 */
const FLIGHT_PATHS: Record<BootFlightStyle, readonly PathKey[]> = {
  /**
   * Default: Sweeps up-left behind OVERTA, banks smoothly around the outside of O
   * while coming forward in depth, then slingshots across the lower-front to overtake E.
   */
  orbit: [
    { t: 0.0, nx: 0.0, yEm: 0.0, depth: 0.2 },
    { t: 0.1, nx: -0.22, yEm: -0.26, depth: -0.55 },
    { t: 0.2, nx: -0.56, yEm: -0.38, depth: -0.95 },
    { t: 0.3, nx: -0.88, yEm: -0.32, depth: -1.0 },
    { t: 0.4, nx: -1.07, yEm: -0.1, depth: -0.55 },
    { t: 0.5, nx: -1.04, yEm: 0.18, depth: 0.35 },
    { t: 0.6, nx: -0.76, yEm: 0.26, depth: 0.9 },
    { t: 0.7, nx: -0.32, yEm: 0.14, depth: 1.0 },
    { t: 0.8, nx: 0.22, yEm: -0.08, depth: 1.0 },
    { t: 0.9, nx: 0.74, yEm: -0.12, depth: 0.85 },
    { t: 1.0, nx: 1.0, yEm: 0.0, depth: 0.4 },
  ],
  /**
   * Corkscrew figure-8 weave across the wordmark before banking around O and overtaking E.
   */
  figure8: [
    { t: 0.0, nx: 0.0, yEm: 0.0, depth: 0.2 },
    { t: 0.1, nx: -0.2, yEm: -0.34, depth: -0.7 },
    { t: 0.2, nx: -0.5, yEm: 0.22, depth: 0.65 },
    { t: 0.3, nx: -0.82, yEm: -0.32, depth: -0.9 },
    { t: 0.4, nx: -1.06, yEm: -0.08, depth: -0.5 },
    { t: 0.5, nx: -1.02, yEm: 0.24, depth: 0.45 },
    { t: 0.6, nx: -0.72, yEm: -0.24, depth: 0.95 },
    { t: 0.7, nx: -0.28, yEm: 0.16, depth: 1.0 },
    { t: 0.8, nx: 0.26, yEm: -0.18, depth: 1.0 },
    { t: 0.9, nx: 0.76, yEm: -0.1, depth: 0.8 },
    { t: 1.0, nx: 1.0, yEm: 0.0, depth: 0.4 },
  ],
  /**
   * Compact sprinter's draft: tucks behind T/A, slingshots out into the foreground passing lane,
   * and overtakes E with a high-arcing pounce.
   */
  sprint: [
    { t: 0.0, nx: 0.0, yEm: 0.0, depth: 0.2 },
    { t: 0.1, nx: -0.18, yEm: -0.14, depth: -0.6 },
    { t: 0.2, nx: -0.48, yEm: -0.24, depth: -0.95 },
    { t: 0.3, nx: -0.78, yEm: -0.18, depth: -0.9 },
    { t: 0.4, nx: -0.96, yEm: 0.06, depth: -0.35 },
    { t: 0.5, nx: -0.88, yEm: 0.22, depth: 0.55 },
    { t: 0.6, nx: -0.56, yEm: 0.18, depth: 0.95 },
    { t: 0.7, nx: -0.12, yEm: -0.12, depth: 1.0 },
    { t: 0.8, nx: 0.38, yEm: -0.34, depth: 1.0 },
    { t: 0.9, nx: 0.82, yEm: -0.18, depth: 0.85 },
    { t: 1.0, nx: 1.0, yEm: 0.0, depth: 0.4 },
  ],
};

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function catmullRomDerivative(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  return (
    0.5 *
    ((-p0 + p2) +
      2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t +
      3 * (-p0 + 3 * p1 - 3 * p2 + p3) * t2)
  );
}

function sampleKeys(
  t: number,
  style: BootFlightStyle = "orbit",
): { nx: number; yEm: number; depth: number; dnx: number; dyEm: number } {
  const keys = FLIGHT_PATHS[style] ?? FLIGHT_PATHS.orbit;
  const u = clamp(t);
  const segments = keys.length - 1;
  const scaled = u * segments;
  const i = Math.min(segments - 1, Math.max(0, Math.floor(scaled)));
  const local = scaled - i;
  const k0 = keys[Math.max(0, i - 1)]!;
  const k1 = keys[i]!;
  const k2 = keys[Math.min(segments, i + 1)]!;
  const k3 = keys[Math.min(segments, i + 2)]!;
  const nx = catmullRom(k0.nx, k1.nx, k2.nx, k3.nx, local);
  const yEm = catmullRom(k0.yEm, k1.yEm, k2.yEm, k3.yEm, local);
  const depth = catmullRom(k0.depth, k1.depth, k2.depth, k3.depth, local);
  const dnx = catmullRomDerivative(k0.nx, k1.nx, k2.nx, k3.nx, local) * segments;
  const dyEm = catmullRomDerivative(k0.yEm, k1.yEm, k2.yEm, k3.yEm, local) * segments;
  return { nx, yEm, depth, dnx, dyEm };
}

/** 0–1 progress through the flight window alone. */
export function bootFlightT(progress: number): number {
  const p = clamp(progress);
  if (p <= READY_END) return 0;
  if (p >= FLIGHT_END) return 1;
  return smoother((p - READY_END) / (FLIGHT_END - READY_END));
}

/**
 * Legacy helper: 0 -> 1 across the ready window.
 */
export const bootKMorph = (progress: number): number => {
  const p = clamp(progress);
  const start = 0.02;
  const end = READY_END * 0.92;
  if (p <= start) return 0;
  if (p >= end) return 1;
  return smooth((p - start) / (end - start));
};

/**
 * Bidirectional topological contour morph (1 = pure letter K, 0 = pure Star Ember):
 * - Starts at 1.0 (OVERTAKE with literal K), un-morphs to 0.0 during Ready.
 * - Stays 0.0 throughout Flight.
 * - Morphs from 0.0 back to 1.0 during Settle (OVERTAEK with literal K).
 */
export function bootKContourMorph(progress: number): number {
  const p = clamp(progress);
  if (p <= READY_END) {
    // Hold literal K briefly for initial word recognition, then morph into Ember.
    const unmorphStart = 0.025;
    const unmorphEnd = READY_END * 0.88;
    if (p <= unmorphStart) return 1;
    if (p >= unmorphEnd) return 0;
    return 1 - smoother((p - unmorphStart) / (unmorphEnd - unmorphStart));
  }
  if (p < FLIGHT_END) return 0;
  return smoother((p - FLIGHT_END) / (1 - FLIGHT_END));
}

/** Ember→K settle progress after the overtake lands. */
export function bootKCrossfade(progress: number): number {
  const p = clamp(progress);
  if (p <= FLIGHT_END) return 0;
  return smoother((p - FLIGHT_END) / (1 - FLIGHT_END));
}

/** Map boot progress onto flyForward during the journey (windup → cruise → brake). */
export function bootFlyProgress(progress: number): number {
  const t = bootFlightT(progress);
  return 0.18 + t * 0.7;
}

/** @deprecated kept for older tests — prefer bootFlyProgress. */
export function bootDashProgress(progress: number): number {
  return bootFlyProgress(progress);
}

export type BootLayout = {
  /** Width of the OVERTA run (letters left of the slot). */
  overtaWidth: number;
  slotWidth: number;
  eWidth: number;
  font: number;
};

export type BootFrame = {
  /** Pixel offset from the slot origin (home). */
  x: number;
  /** Pixel offset up (CSS/RN translateY negative is up — callers negate as needed). */
  y: number;
  /** -1 behind … +1 in front. */
  depth: number;
  /** Perspective scale from depth. */
  scale: number;
  /** Horizontal travel direction (-1 flying left, +1 flying right). */
  facing: 1 | -1;
  /** Continuous horizontal velocity normalized in [-1, 1] for smooth banking/yaw. */
  velocityX: number;
  /** Continuous vertical velocity normalized in [-1, 1] for pitch. */
  velocityY: number;
  /** E slides left into the slot as Ember overtakes. */
  eShift: number;
  /** Subtle vertical hop on E as Ember breezes past it. */
  eLift: number;
  /** 1 = pure geometric letter K, 0 = pure Star Ember. */
  kMorph: number;
  emberOpacity: number;
  kOpacity: number;
  /** Soft pullback before launch. */
  windup: number;
  phase: "Ready" | "Flight" | "OVERTAEK";
  /** 0–1 flight completion (0 during ready). */
  travel: number;
};

/**
 * Resolve Ember’s seat for a boot progress + measured word layout.
 * Path is authored in normalized slot space, then scaled to real letter widths
 * so the orbit tracks the O and the finish lands after E.
 */
export function bootFrame(
  progress: number,
  layout?: BootLayout,
  style: BootFlightStyle = "orbit",
): BootFrame {
  const p = clamp(progress);
  const font = layout?.font ?? 1;
  const overta = layout?.overtaWidth ?? font * 3.6;
  const slot = layout?.slotWidth ?? font * 0.9;
  const eWidth = layout?.eWidth ?? font * 0.55;
  const behindSpan = overta + slot * 0.55;
  const finalSpan = eWidth;
  const kMorph = bootKContourMorph(p);

  const windup =
    p > READY_END * 0.55 && p < READY_END
      ? -Math.sin(((p - READY_END * 0.55) / (READY_END * 0.45)) * Math.PI)
      : 0;

  if (p <= READY_END) {
    return {
      x: font * 0.045 * windup * (1 - kMorph),
      y: font * 0.025 * Math.abs(windup) * (1 - kMorph),
      depth: 0.2,
      scale: 1,
      facing: 1,
      velocityX: 0,
      velocityY: 0,
      eShift: 0,
      eLift: 0,
      kMorph,
      emberOpacity: 1,
      kOpacity: 0,
      windup,
      phase: "Ready",
      travel: 0,
    };
  }

  const flightT = bootFlightT(p);
  const sample = sampleKeys(flightT, style);
  const x = sample.nx <= 0 ? sample.nx * behindSpan : sample.nx * finalSpan;
  const y = sample.yEm * font;
  const depth = Math.max(-1, Math.min(1, sample.depth));
  const scale = (0.78 + 0.26 * ((depth + 1) / 2)) * (1 - kMorph) + kMorph;
  const facing: 1 | -1 = sample.dnx < -0.02 ? -1 : 1;
  const velocityX = Math.max(-1, Math.min(1, sample.dnx / 3.2));
  const velocityY = Math.max(-1, Math.min(1, sample.dyEm / 2.2));
  // E yields once Ember is surging past mid-word on the foreground return pass.
  const eShift = smoother(clamp((flightT - 0.68) / 0.24));
  const eLift = Math.sin(eShift * Math.PI) * font * 0.04;
  const fade = bootKCrossfade(p);

  return {
    x: x + font * 0.04 * windup * (1 - flightT),
    y: y * (1 - kMorph),
    depth,
    scale,
    facing,
    velocityX: velocityX * (1 - kMorph),
    velocityY: velocityY * (1 - kMorph),
    eShift,
    eLift,
    kMorph,
    emberOpacity: 1 - fade,
    kOpacity: fade,
    windup,
    phase: p >= FLIGHT_END || fade > 0.55 ? "OVERTAEK" : "Flight",
    travel: flightT,
  };
}

