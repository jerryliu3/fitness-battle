import { clamp } from "./motion";

/** The selected 35% clean staggered chase; keep Ember available as an alternative. */
export const DEFAULT_BOOT_SPLASH_VARIANT = "logo-race";
export type BootSplashVariant = "logo-race" | "ember";
export const LOGO_RACE_DURATION_MS = 5400;

function hermiteTangents(points: [number, number][]) {
  const slopes = points.slice(1).map(([t1, y1], i) => (y1 - points[i][1]) / (t1 - points[i][0]));
  return points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === points.length - 1) return 0;
    const prev = slopes[i - 1], next = slopes[i];
    if (prev * next <= 0) return 0;
    return Math.sign(prev) * Math.min(Math.abs((prev + next) / 2), 3 * Math.abs(prev), 3 * Math.abs(next));
  });
}

/** Monotone C1 cubic Hermite interpolation so multi-stage races never pause at intermediate waypoints. */
function smoothTrack(p: number, points: [number, number][]) {
  if (p <= points[0][0]) return points[0][1];
  const tangents = hermiteTangents(points);
  for (let i = 1; i < points.length; i++) {
    const [t0, y0] = points[i - 1], [t1, y1] = points[i];
    if (p <= t1) {
      const h = t1 - t0, s = clamp((p - t0) / h), s2 = s * s, s3 = s2 * s;
      return (2 * s3 - 3 * s2 + 1) * y0 + (s3 - 2 * s2 + s) * h * tangents[i - 1] + (-2 * s3 + 3 * s2) * y1 + (s3 - s2) * h * tangents[i];
    }
  }
  return points[points.length - 1][1];
}

function smoothVelocity(p: number, points: [number, number][]) {
  if (p <= points[0][0] || p >= points[points.length - 1][0]) return 0;
  const tangents = hermiteTangents(points);
  for (let i = 1; i < points.length; i++) {
    const [t0, y0] = points[i - 1], [t1, y1] = points[i];
    if (p <= t1) {
      const h = t1 - t0, s = clamp((p - t0) / h), s2 = s * s;
      return ((6 * s2 - 6 * s) * (y0 - y1) + (3 * s2 - 4 * s + 1) * h * tangents[i - 1] + (3 * s2 - 2 * s) * h * tangents[i]) / h;
    }
  }
  return 0;
}

export function stackedLayout(concept: string) {
  if (concept === "chase-open") return { ox: 232, tx: 296, oy: 211, gap: 48, lean: 9, heightOverlap: .35, letterOverlap: 3, bordered: true };
  if (concept === "chase-mid") return { ox: 232, tx: 296, oy: 213, gap: 44, lean: 9, heightOverlap: .4, letterOverlap: 3, bordered: false };
  if (concept === "chase-close") return { ox: 232, tx: 296, oy: 213, gap: 44, lean: 9, heightOverlap: .4, letterOverlap: 3, bordered: true };
  return { ox: 232, tx: 296, oy: 211, gap: 48, lean: 9, heightOverlap: .35, letterOverlap: 3, bordered: false };
}

export function staggeredLogoFrame(p: number, concept = "chase-stagger") {
  const layout = stackedLayout(concept);
  // "over" enters first by itself (0..0.18), then "taek" charges in (0.16..0.44) and edges ahead,
  // "over" counters to retake the lead (0.44..0.68), and "taek" pulls away into the final lockup (0.68..0.94).
  const overPoints: [number, number][] = [[0, -260], [.18, 78], [.44, 136], [.68, 210], [.9, layout.ox]];
  const taekPoints: [number, number][] = [[.16, -340], [.44, 150], [.68, 172], [.94, layout.tx]];
  const ox = smoothTrack(p, overPoints);
  const tx = smoothTrack(p, taekPoints);
  const overSpeed = clamp(smoothVelocity(p, overPoints) / 850);
  const taekSpeed = clamp(smoothVelocity(p, taekPoints) / 950);
  return { layout, ox, tx, overSpeed, taekSpeed, overRight: ox + 248, taekRight: tx + 272 };
}

export interface LogoRaceWord {
  word: "over" | "taek";
  x: number;
  y: number;
  width: number;
  lean: number;
  opacity: number;
  echo: boolean;
}

/** Shared SVG coordinates and choreography for DOM and native renderers. */
export function logoRaceWords(progress: number, reducedMotion = false): LogoRaceWord[] {
  const p = reducedMotion ? 1 : clamp(progress);
  const { layout, ox, tx, overSpeed, taekSpeed } = staggeredLogoFrame(p);
  const between = (a: number, b: number) => clamp((p - a) / (b - a));
  const moving = reducedMotion ? 0 : Math.sin(between(.06, .92) * Math.PI);
  const rows = [
    { word: "over" as const, x: ox, y: layout.oy, width: 248, speed: reducedMotion ? 0 : overSpeed, enter: between(.01, .14), leanSpeed: 9, trailSpeed: 12, trailOpacity: .55 },
    { word: "taek" as const, x: tx, y: layout.oy + layout.gap, width: 272, speed: reducedMotion ? 0 : taekSpeed, enter: between(.16, .28), leanSpeed: 10, trailSpeed: 13, trailOpacity: .65 },
  ];
  const words = rows.map(row => ({
    word: row.word, x: row.x, y: row.y, width: row.width,
    lean: layout.lean + row.speed * row.leanSpeed + moving * 2,
    opacity: 1 - (1 - row.enter) ** 3, echo: false,
  }));
  return [
    ...rows.flatMap((row, index) => [3, 2, 1].map(i => ({
      ...words[index], x: row.x - i * (19 + row.speed * row.trailSpeed),
      opacity: words[index].opacity * (.19 - i * .044) * (1 + row.speed * row.trailOpacity), echo: true,
    }))),
    ...words,
  ];
}
