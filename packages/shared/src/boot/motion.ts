export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};

/**
 * Wall-clock length: ready K-morph, then a long fly (behind → around O → overtake),
 * then Ember→K crossfade settle.
 */
export const BOOT_DURATION_MS = 3200;

/** Standing / K-morph window. */
export const READY_END = 0.2;
/** Flight finishes; remainder is crossfade settle. */
export const FLIGHT_END = 0.86;
/** @deprecated alias — flight end is the old “zoom end”. */
export const ZOOM_END = FLIGHT_END;

type PathKey = {
  /** 0–1 within the flight window. */
  t: number;
  /**
   * Horizontal slot: 0 = home in the K slot, -1 = left edge of OVERTA / around O,
   * +1 = final seat after E.
   */
  nx: number;
  /** Vertical offset in em (negative = up). */
  yEm: number;
  /** -1 behind letters, +1 in front. */
  depth: number;
};

/**
 * Authored flight: left behind the word, loop the O, come forward, overtake E.
 * Catmull-Rom through these keys keeps velocity continuous for object consistency.
 */
const FLIGHT_KEYS: PathKey[] = [
  { t: 0, nx: 0, yEm: 0, depth: 0.2 },
  { t: 0.1, nx: -0.18, yEm: -0.35, depth: -0.45 },
  { t: 0.28, nx: -0.72, yEm: -0.12, depth: -1 },
  { t: 0.4, nx: -0.98, yEm: 0.55, depth: -0.65 },
  { t: 0.48, nx: -1.08, yEm: 0.05, depth: -0.1 },
  { t: 0.56, nx: -0.95, yEm: -0.7, depth: 0.55 },
  { t: 0.66, nx: -0.55, yEm: -0.55, depth: 1 },
  { t: 0.8, nx: -0.08, yEm: -0.32, depth: 1 },
  { t: 0.9, nx: 0.55, yEm: -0.12, depth: 1 },
  { t: 1, nx: 1, yEm: 0, depth: 1 },
];

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

function sampleKeys(t: number): { nx: number; yEm: number; depth: number; dnx: number } {
  const u = clamp(t);
  if (u <= FLIGHT_KEYS[0].t) {
    const a = FLIGHT_KEYS[0];
    const b = FLIGHT_KEYS[1];
    return { nx: a.nx, yEm: a.yEm, depth: a.depth, dnx: b.nx - a.nx };
  }
  if (u >= FLIGHT_KEYS[FLIGHT_KEYS.length - 1].t) {
    const n = FLIGHT_KEYS.length;
    const a = FLIGHT_KEYS[n - 2];
    const b = FLIGHT_KEYS[n - 1];
    return { nx: b.nx, yEm: b.yEm, depth: b.depth, dnx: b.nx - a.nx };
  }
  let i = 0;
  while (i < FLIGHT_KEYS.length - 1 && FLIGHT_KEYS[i + 1].t < u) i += 1;
  const k0 = FLIGHT_KEYS[Math.max(0, i - 1)];
  const k1 = FLIGHT_KEYS[i];
  const k2 = FLIGHT_KEYS[Math.min(FLIGHT_KEYS.length - 1, i + 1)];
  const k3 = FLIGHT_KEYS[Math.min(FLIGHT_KEYS.length - 1, i + 2)];
  const span = Math.max(1e-6, k2.t - k1.t);
  const local = (u - k1.t) / span;
  const nx = catmullRom(k0.nx, k1.nx, k2.nx, k3.nx, local);
  const yEm = catmullRom(k0.yEm, k1.yEm, k2.yEm, k3.yEm, local);
  const depth = catmullRom(k0.depth, k1.depth, k2.depth, k3.depth, local);
  const dnx = (catmullRom(k0.nx, k1.nx, k2.nx, k3.nx, Math.min(1, local + 0.02)) - nx) / 0.02;
  return { nx, yEm, depth, dnx };
}

/** 0–1 progress through the flight window alone. */
export function bootFlightT(progress: number): number {
  const p = clamp(progress);
  if (p <= READY_END) return 0;
  if (p >= FLIGHT_END) return 1;
  return smooth((p - READY_END) / (FLIGHT_END - READY_END));
}

/**
 * How far Ember has morphed from standing rest into a K-like arm silhouette.
 * Completes in ready so the launch reads as an already-formed K.
 */
export const bootKMorph = (progress: number): number => {
  const p = clamp(progress);
  const start = 0.02;
  const end = READY_END * 0.92;
  if (p <= start) return 0;
  if (p >= end) return 1;
  return smooth((p - start) / (end - start));
};

/** Ember→K letter crossfade after the overtake lands. */
export function bootKCrossfade(progress: number): number {
  const p = clamp(progress);
  if (p <= FLIGHT_END) return 0;
  return smooth((p - FLIGHT_END) / (1 - FLIGHT_END));
}

/** Map boot progress onto flyForward during the journey (windup → cruise → brake). */
export function bootFlyProgress(progress: number): number {
  const t = bootFlightT(progress);
  // Keep the sampler inside the authored flyForward cruise, not the rest bookends.
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
  /** Horizontal facing for the host (flip when flying left). */
  facing: 1 | -1;
  /** E slides left into the slot as Ember overtakes. */
  eShift: number;
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
export function bootFrame(progress: number, layout?: BootLayout): BootFrame {
  const p = clamp(progress);
  const font = layout?.font ?? 1;
  const overta = layout?.overtaWidth ?? font * 3.6;
  const slot = layout?.slotWidth ?? font * 0.9;
  const eWidth = layout?.eWidth ?? font * 0.55;
  const behindSpan = overta + slot * 0.55;
  const finalSpan = eWidth;

  const windup =
    p > READY_END * 0.45 && p < READY_END
      ? -Math.sin(((p - READY_END * 0.45) / (READY_END * 0.55)) * Math.PI)
      : 0;

  if (p <= READY_END) {
    return {
      x: font * 0.05 * windup,
      y: 0,
      depth: 0.2,
      scale: 1,
      facing: 1,
      eShift: 0,
      emberOpacity: 1,
      kOpacity: 0,
      windup,
      phase: "Ready",
      travel: 0,
    };
  }

  const flightT = bootFlightT(p);
  const sample = sampleKeys(flightT);
  const x =
    sample.nx <= 0 ? sample.nx * behindSpan : sample.nx * finalSpan;
  const y = sample.yEm * font;
  const depth = Math.max(-1, Math.min(1, sample.depth));
  const scale = 0.78 + 0.22 * ((depth + 1) / 2);
  const facing: 1 | -1 = sample.dnx < -0.02 ? -1 : 1;
  // E yields once Ember is clearly past mid-word on the return pass.
  const eShift = smooth(clamp((flightT - 0.72) / 0.22));
  const fade = bootKCrossfade(p);

  return {
    x: x + font * 0.04 * windup * (1 - flightT),
    y,
    depth,
    scale,
    facing,
    eShift,
    emberOpacity: 1 - fade,
    kOpacity: fade,
    windup,
    phase: p >= FLIGHT_END || fade > 0.55 ? "OVERTAEK" : "Flight",
    travel: flightT,
  };
}
