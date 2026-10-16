export const clamp = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
export const smooth = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};

/**
 * Wall-clock length: ready K-morph, then a long fly (behind → around O → overtake),
 * then the same outline returns to K.
 */
export const BOOT_DURATION_MS = 3200;

/** Standing / K-morph window. */
export const READY_END = 0.2;
/** Flight finishes; remainder is geometric morph settle. */
export const FLIGHT_END = 0.78;
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
 * Non-uniform Hermite interpolation preserves velocity through unequal key intervals.
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

/** Non-uniform cubic Hermite: derivatives use actual key times, so knot velocity agrees. */
function sampleKeys(t: number, behind = 1, front = 1): { nx: number; yEm: number; depth: number } {
  const u = clamp(t);
  let end = 1;
  while (end < FLIGHT_KEYS.length - 1 && u > FLIGHT_KEYS[end].t) end++;
  const a = FLIGHT_KEYS[end - 1], b = FLIGHT_KEYS[end];
  const span = b.t - a.t, v = (u - a.t) / span;
  type Channel = "nx" | "yEm" | "depth";
  const value = (index: number, key: Channel) => {
    const k = FLIGHT_KEYS[index];
    return key === "nx" ? k.nx * (k.nx <= 0 ? behind : front) : k[key];
  };
  const tangent = (index: number, key: Channel) => {
    if (index === 0 || index === FLIGHT_KEYS.length - 1) return 0;
    const prev = FLIGHT_KEYS[index - 1], next = FLIGHT_KEYS[index + 1];
    return (value(index + 1, key) - value(index - 1, key)) / (next.t - prev.t);
  };
  const channel = (key: Channel) =>
    (2*v**3 - 3*v*v + 1) * value(end - 1, key) +
    (v**3 - 2*v*v + v) * span * tangent(end - 1, key) +
    (-2*v**3 + 3*v*v) * value(end, key) +
    (v**3 - v*v) * span * tangent(end, key);
  return { nx: channel("nx"), yEm: channel("yEm"), depth: channel("depth") };
}

/** 0–1 progress through the flight window alone. */
export function bootFlightT(progress: number): number {
  const p = clamp(progress);
  if (p <= READY_END) return 0;
  if (p >= FLIGHT_END) return 1;
  return smooth((p - READY_END) / (FLIGHT_END - READY_END));
}

/** One surface starts as K, unfolds to Ember, then returns to K after landing. */
export const bootKMorph = (progress: number): number => {
  const p = clamp(progress);
  if (p <= READY_END) return 1 - smooth((p - 0.025) / (READY_END - 0.025));
  return smooth((p - FLIGHT_END) / (1 - FLIGHT_END - 0.025));
};

/** @deprecated Historical name for final morph progress; no layer crossfade is rendered. */
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
  facing: number;
  /** Same outline's K interpolation, never host opacity. */
  morph: number;
  /** Flight tangent in screen space. */
  angle: number;
  /** E slides left into the slot as Ember overtakes. */
  eShift: number;

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
  const slot = layout?.slotWidth ?? font * 0.712;
  const eWidth = layout?.eWidth ?? font * 0.55;
  const behindSpan = overta + slot * 0.55;
  // Match the text run's tracking after E, including the K's side bearing.
  const finalSpan = eWidth - font * 0.055;

  const windup =
    p > READY_END * 0.45 && p < READY_END
      ? -(Math.sin(((p - READY_END * 0.45) / (READY_END * 0.55)) * Math.PI) ** 2)
      : 0;

  if (p <= READY_END) {
    return {
      x: font * 0.05 * windup,
      y: 0,
      depth: 0.2,
      scale: 1,
      facing: 1,
      eShift: 0,
      morph: bootKMorph(p),
      angle: 0,
      windup,
      phase: "Ready",
      travel: 0,
    };
  }

  const flightT = bootFlightT(p);
  const sample = sampleKeys(flightT, behindSpan, finalSpan);
  const x = sample.nx;
  const y = sample.yEm * font;
  const depth = Math.max(-1, Math.min(1, sample.depth));
  // Recede behind the ink, grow slightly on the return pass, settle at exactly one.
  const scale = 1 - 0.22 * Math.max(0, -depth) + 0.18 * Math.max(0, depth) * Math.sin(Math.PI * flightT) ** 2;
  const facing = flightT < 0.3
    ? 1 - 2 * smooth(flightT / 0.09)
    : -1 + 2 * smooth((flightT - 0.4) / 0.18);
  const before = sampleKeys(Math.max(0, flightT - 0.001), behindSpan, finalSpan);
  const after = sampleKeys(Math.min(1, flightT + 0.001), behindSpan, finalSpan);
  const angle = Math.atan2((after.yEm - before.yEm) * font, Math.abs(after.nx - before.nx) + 0.0001) * 180 / Math.PI;
  // E yields once Ember is clearly past mid-word on the return pass.
  const eShift = smooth(clamp((flightT - 0.72) / 0.22));

  return {
    x: x + font * 0.04 * windup * (1 - flightT),
    y,
    depth,
    scale,
    facing,
    eShift,
    morph: bootKMorph(p),
    angle,
    windup,
    phase: p >= FLIGHT_END ? "OVERTAEK" : "Flight",
    travel: flightT,
  };
}
