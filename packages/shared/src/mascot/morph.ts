import {
  EMBER_MODEL, deformEmberPoint, emberContour, emberDepthOffset, emberSideWalls,
  type EmberPose,
} from "./model";
import { EMBER_K_OUTLINE } from "./k-outline";
import { sampleLimbMorph, type EmberLimbConcept } from "./limb-morph";

import { launchMorphPoints, type EmberLaunchConcept } from "./launch-shape";

export type EmberMorphConcept = "baseline" | EmberLimbConcept | EmberLaunchConcept;

type Point = readonly [number, number];
const clamp = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
const point = (p: Point) => `${p[0].toFixed(3)} ${p[1].toFixed(3)}`;
// Authored seam correspondence: puts the K's inside elbow between Ember's arms.
// The nearest-distance seam folds the lower diagonal. The geometry test sweeps
// this correspondence in both directions to keep the entire silhouette simple.
const K_SEAM = 44;

/** Equal perimeter spacing makes correspondence independent of segment count. */
function outline(pose: EmberPose): Point[] {
  const dense: Point[] = [];
  let start: Point = EMBER_MODEL.start;
  for (const segment of EMBER_MODEL.body) {
    const controls = [start, [segment[0], segment[1]], [segment[2], segment[3]], [segment[4], segment[5]]]
      .map(([x, y]) => deformEmberPoint(x, y, pose));
    for (let i = 0; i < 16; i++) {
      const t = i / 16, u = 1 - t;
      const weights = [u ** 3, 3 * u * u * t, 3 * u * t * t, t ** 3];
      dense.push([0, 1].map(k => controls.reduce((v, p, j) => v + p[k] * weights[j], 0)) as [number, number]);
    }
    start = [segment[4], segment[5]];
  }
  dense.push(dense[0]);
  const lengths = [0];
  for (let i = 1; i < dense.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  }
  let j = 0;
  return EMBER_K_OUTLINE.map((_, i) => {
    const d = i * lengths[lengths.length - 1] / EMBER_K_OUTLINE.length;
    while (lengths[j + 1] < d) j++;
    const t = (d - lengths[j]) / (lengths[j + 1] - lengths[j]);
    return [dense[j][0] + (dense[j + 1][0] - dense[j][0]) * t, dense[j][1] + (dense[j + 1][1] - dense[j][1]) * t];
  });
}

function morphedPoints(pose: EmberPose, t: number, concept: EmberMorphConcept, flight = 0): Point[] {
  if (concept === "crest-launch" || concept === "race-launch") return launchMorphPoints(pose, t, concept, flight);
  if (concept !== "baseline") return sampleLimbMorph(pose, t, concept);
  return outline(pose).map((p, i) => {
    const k = EMBER_K_OUTLINE[(i + K_SEAM) % EMBER_K_OUTLINE.length];
    return [p[0] + (k[0] - p[0]) * t, p[1] + (k[1] - p[1]) * t];
  });
}

/** One continuous opaque surface, reversible at every progress value. */
export function morphEmberContour(pose: EmberPose, amount: number, concept: EmberMorphConcept = "baseline", flight = 0): string {
  const t = clamp(amount);
  if (t === 0 && concept !== "crest-launch" && concept !== "race-launch") return emberContour(pose);
  return `M ${morphedPoints(pose, t, concept, flight).map(point).join(" L ")} Z`;
}

/** Depth follows the new outline, leaving no old star behind the letter. */
export function morphEmberSideWalls(pose: EmberPose, amount: number, concept: EmberMorphConcept = "baseline", flight = 0): string {
  const t = clamp(amount);
  if (t === 0 && concept !== "crest-launch" && concept !== "race-launch") return emberSideWalls(pose);
  const points = morphedPoints(pose, t, concept, flight);
  const [dx, dy] = emberDepthOffset(pose).map(v => v * (1 - t));
  return points.map((a, i) => {
    const b = points[(i + 1) % points.length];
    const quad: Point[] = [a, b, [b[0] + dx, b[1] + dy], [a[0] + dx, a[1] + dy]];
    if ((b[1] - a[1]) * dx - (b[0] - a[0]) * dy < 0) quad.reverse();
    return `M ${quad.map(point).join(" L ")} Z`;
  }).join(" ");
}

export function emberMorphColor(hex: string, amount: number): string {
  const target = "#fff9e9", t = clamp(amount);
  return "#" + [1, 3, 5].map(i => Math.round(
    parseInt(hex.slice(i, i + 2), 16) * (1 - t) + parseInt(target.slice(i, i + 2), 16) * t,
  ).toString(16).padStart(2, "0")).join("");
}
