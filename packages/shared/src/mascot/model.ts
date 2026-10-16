/** Star Ember v2. A continuous face, connected side walls and a soft joint rig. */
export const EMBER_MODEL = {
  version: 2,
  viewBox: "0 -85 360 485",
  width: 360,
  height: 485,
  pivot: [180, 235],
  palette: {
    gold: "#ffc629", light: "#ffd648", edge: "#e98a06",
    ink: "#234039", mouth: "#74351e", tongue: "#e47b64",
    glint: "#fffef3", shadow: "#17231e",
  },
  /** Cubic Bézier segments: [control1.x, control1.y, control2.x, control2.y, end.x, end.y]. */
  start: [140, 57],
  body: [
    [154, 45, 211, 64, 228, 155],
    [254, 160, 303, 164, 308, 177],
    [311, 191, 280, 219, 261, 238],
    [255, 250, 269, 342, 250, 345],
    [235, 351, 196, 290, 182, 289],
    [167, 285, 125, 350, 109, 346],
    [91, 345, 97, 261, 99, 238],
    [96, 228, 40, 186, 45, 172],
    [48, 160, 105, 152, 126, 149],
    [134, 127, 161, 99, 146, 76],
    [142, 68, 133, 62, 140, 57],
  ],
  /** The crescent follows the same deformation field as the connected body. */
  crescentStart: [140, 57],
  crescent: [
    [156, 67, 176, 89, 166, 119],
    [162, 139, 152, 146, 126, 149],
    [134, 127, 161, 99, 146, 76],
    [142, 68, 133, 62, 140, 57],
  ],
  joints: { crest: [180, 155], armLeft: [112, 230], armRight: [254, 210], legLeft: [141, 273], legRight: [221, 273] },
} as const;

export type EmberExpression = "smile" | "happy" | "wink" | "joy" | "surprised" | "focused";
export const EMBER_EXPRESSIONS: readonly EmberExpression[] = ["smile", "happy", "wink", "joy", "surprised", "focused"];

/** Screen-left and screen-right controls; angles are degrees, translations are viewBox units. */
export interface EmberPose {
  x: number; y: number; rotation: number; scaleX: number; scaleY: number;
  yaw: number; crest: number; armLeft: number; armRight: number;
  legLeft: number; legRight: number; lookX: number; lookY: number;
  eyeLeft: number; eyeRight: number; mouthOpen: number; smile: number;
  sparkle: number; trail: number;
  /** Travel direction: 0 = right, -45 = up-right, -90 = up. Effects follow this heading. */
  heading: number;
  /** Aerodynamic arm fold and extra apparent extrusion, both in [0, 1]. */
  wind: number; depth: number;
}

export const EMBER_REST: Readonly<EmberPose> = Object.freeze({
  x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
  yaw: 0, crest: 0, armLeft: 0, armRight: 0, legLeft: 0, legRight: 0,
  lookX: 0, lookY: 0, eyeLeft: 1, eyeRight: 1, mouthOpen: 0, smile: 1,
  sparkle: 0, trail: 0, heading: 0, wind: 0, depth: 0,
});

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Contain external input so a slider or incomplete persisted pose cannot corrupt the paths. */
export function normalizeEmberPose(input: Partial<EmberPose> = {}): EmberPose {
  const p = { ...EMBER_REST };
  for (const key of Object.keys(p) as (keyof EmberPose)[]) {
    const value = input[key];
    if (typeof value === "number" && Number.isFinite(value)) p[key] = value;
  }
  for (const key of ["yaw", "crest", "armLeft", "armRight", "legLeft", "legRight", "lookX", "lookY", "smile"] as const) p[key] = clamp(p[key], -1, 1);
  for (const key of ["eyeLeft", "eyeRight", "mouthOpen", "sparkle", "trail", "wind", "depth"] as const) p[key] = clamp(p[key], 0, 1);
  p.scaleX = clamp(p.scaleX, 0.65, 1.35);
  p.scaleY = clamp(p.scaleY, 0.65, 1.35);
  p.x = clamp(p.x, -45, 45); p.y = clamp(p.y, -90, 15);
  p.rotation = clamp(p.rotation, -35, 35);
  p.heading = clamp(p.heading, -90, 0);
  return p;
}

export function blendEmberPoses(from: Partial<EmberPose>, to: Partial<EmberPose>, amount: number): EmberPose {
  const a = normalizeEmberPose(from), b = normalizeEmberPose(to);
  const t = Number.isFinite(amount) ? clamp(amount, 0, 1) : 0;
  const result = { ...a };
  for (const key of Object.keys(a) as (keyof EmberPose)[]) result[key] = a[key] + (b[key] - a[key]) * t;
  return result;
}

export function emberExpression(expression: EmberExpression): Partial<EmberPose> {
  switch (expression) {
    case "happy": return { mouthOpen: 0.85 };
    case "wink": return { eyeLeft: 0, mouthOpen: 0.75 };
    case "joy": return { eyeLeft: 0, eyeRight: 0, mouthOpen: 1 };
    case "surprised": return { mouthOpen: 0.65, smile: 0 };
    case "focused": return { eyeLeft: 0.7, eyeRight: 0.7, smile: 0.25 };
    default: return {};
  }
}

const smoothWeight = (value: number) => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };

/** Rotate around a fixed joint; the distal region retains its length and curved tip. */
export function rotateEmberPoint(x: number, y: number, joint: readonly [number, number], degrees: number): [number, number] {
  const radians = degrees * Math.PI / 180, dx = x - joint[0], dy = y - joint[1];
  return [joint[0] + dx * Math.cos(radians) - dy * Math.sin(radians), joint[1] + dx * Math.sin(radians) + dy * Math.cos(radians)];
}

/** Blend joint rotations at the roots, with rigid motion across each rounded tip. */
export function deformEmberPoint(x: number, y: number, p: EmberPose): [number, number] {
  const armBand = 1 - smoothWeight((y - 202) / 48);
  const crest = smoothWeight((155 - y) / 65);
  const left = smoothWeight((145 - x) / 70) * armBand;
  const right = smoothWeight((x - 217) / 63) * armBand;
  const foot = smoothWeight((y - 265) / 60);
  const legL = smoothWeight((182 - x) / 65) * foot;
  const legR = smoothWeight((x - 182) / 65) * foot;
  const joints = EMBER_MODEL.joints;
  const upward = -Math.sin(p.heading * Math.PI / 180);
  const rotations = [
    [joints.crest, -p.crest * 55, crest],
    [joints.armLeft, p.armLeft * 32 - p.wind * (34 + 36 * upward), left],
    [joints.armRight, -p.armRight * 32 + p.wind * (100 - 30 * upward), right],
    [joints.legLeft, p.legLeft * 38, legL],
    [joints.legRight, -p.legRight * 38, legR],
  ] as const;
  let dx = 0, dy = 0;
  for (const [joint, angle, weight] of rotations) {
    const rotated = rotateEmberPoint(x, y, joint, angle);
    dx += (rotated[0] - x) * weight; dy += (rotated[1] - y) * weight;
  }
  // A soft underarm corrective keeps the inner handle outside the torso as the
  // far arm folds down/back. The tip and shoulder still follow their joint arc.
  const underarm = smoothWeight((x - 250) / 25) * smoothWeight((y - 195) / 24) * (1 - smoothWeight((y - 219) / 19));
  dx += p.wind * 20 * underarm; dy += p.wind * 22 * underarm;
  return [x + dx, y + dy];
}

/** The back recedes left/down at rest and farther against the travel direction in a burst. */
export function emberDepthOffset(p: EmberPose): [number, number] {
  const radians = (p.heading - p.rotation) * Math.PI / 180;
  return [-10 - Math.abs(p.yaw) * 10 - Math.cos(radians) * p.depth * 12, 5 - Math.sin(radians) * p.depth * 12];
}

/** Swept cubic side walls join corresponding front/back edges, including every tip. */
export function emberSideWalls(p: EmberPose): string {
  const [dx, dy] = emberDepthOffset(p);
  const point = ([x, y]: readonly number[]) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  const back = ([x, y]: readonly number[]) => [x + dx, y + dy];
  let start = deformEmberPoint(...EMBER_MODEL.start, p);
  return EMBER_MODEL.body.map(s => {
    const c1 = deformEmberPoint(s[0], s[1], p), c2 = deformEmberPoint(s[2], s[3], p), end = deformEmberPoint(s[4], s[5], p);
    // Give overlapping patches the same winding so concave joins cannot cancel into holes.
    const outward = (end[1] - start[1]) * dx - (end[0] - start[0]) * dy > 0;
    const wall = outward
      ? `M ${point(start)} C ${point(c1)} ${point(c2)} ${point(end)} L ${point(back(end))} C ${point(back(c2))} ${point(back(c1))} ${point(back(start))} Z`
      : `M ${point(end)} C ${point(c2)} ${point(c1)} ${point(start)} L ${point(back(start))} C ${point(back(c1))} ${point(back(c2))} ${point(back(end))} Z`;
    start = end;
    return wall;
  }).join(" ");
}

export function emberContour(pose: EmberPose, crescent = false): string {
  const start = crescent ? EMBER_MODEL.crescentStart : EMBER_MODEL.start;
  const segments = crescent ? EMBER_MODEL.crescent : EMBER_MODEL.body;
  const point = (x: number, y: number) => deformEmberPoint(x, y, pose).map(v => v.toFixed(2)).join(" ");
  return `M ${point(...start)} ${segments.map(s => `C ${point(s[0], s[1])} ${point(s[2], s[3])} ${point(s[4], s[5])}`).join(" ")} Z`;
}

/**
 * Topological K-morph concepts:
 * - "tucked" (Concept 1): Top-left = hair/crest, Top-right = anatomical left arm (screen-right),
 *   Bottom-left = anatomical right leg + right arm tucked against side, Bottom-right = anatomical left leg.
 * - "skater" (Concept 2): Top-left = anatomical right arm raised high, Top-right = hair/crest leaning forward,
 *   Bottom-left = anatomical right leg planted back, Bottom-right = anatomical left arm + left leg tucked together
 *   like a speed skater at the starting line.
 */
export type EmberKConcept = "tucked" | "skater";
export const EMBER_K_CONCEPTS: readonly EmberKConcept[] = ["tucked", "skater"];

type ContourShape = {
  start: readonly [number, number];
  segments: readonly (readonly [number, number, number, number, number, number])[];
};

/**
 * Concept 1 ("tucked") intermediate organic character-K silhouette (at morph ~ 0.48):
 * Crest upright at top-left, screen-right arm up-right, screen-right leg down-right,
 * screen-left leg straight down-left, and screen-left arm tucked down along the left side.
 */
const K_TUCKED_MID: ContourShape = {
  start: [128, 54],
  segments: [
    [142, 62, 148, 122, 148, 174],
    [186, 134, 266, 56, 294, 58],
    [310, 72, 254, 148, 206, 196],
    [238, 238, 298, 316, 292, 342],
    [270, 352, 206, 288, 154, 236],
    [148, 286, 144, 344, 118, 346],
    [92, 348, 76, 342, 74, 312],
    [72, 296, 56, 282, 58, 256],
    [56, 224, 70, 184, 78, 148],
    [78, 112, 76, 72, 84, 56],
    [96, 48, 114, 48, 128, 54],
  ],
};

/**
 * Concept 1 ("tucked") final architectural capital K contour (at morph = 1.0):
 * Matches Nunito Sans 900 Black cap-height (y: 52..346) and stem weight.
 */
const K_TUCKED_FINAL: ContourShape = {
  start: [134, 52],
  segments: [
    [134, 94, 134, 136, 134, 178],
    [182, 126, 244, 52, 296, 52],
    [304, 58, 250, 132, 196, 194],
    [240, 252, 298, 332, 304, 346],
    [234, 346, 220, 330, 134, 222],
    [134, 264, 134, 305, 134, 346],
    [112, 346, 88, 346, 66, 346],
    [66, 312, 66, 278, 66, 244],
    [66, 206, 66, 168, 66, 130],
    [66, 98, 66, 72, 66, 52],
    [88, 52, 112, 52, 134, 52],
  ],
};

/**
 * Concept 2 ("skater") intermediate organic speed-skater silhouette (at morph ~ 0.48):
 * Screen-left arm (Ember's right arm) thrown high up-left, crest leaning into top-right,
 * screen-right arm + leg tucked together down-right like a speed skater, screen-left leg planted down-left.
 */
const K_SKATER_MID: ContourShape = {
  start: [288, 58],
  segments: [
    [302, 74, 252, 146, 204, 194],
    [236, 218, 284, 262, 286, 288],
    [288, 304, 262, 302, 268, 314],
    [284, 326, 302, 344, 272, 346],
    [232, 348, 194, 286, 152, 232],
    [144, 286, 132, 346, 88, 346],
    [68, 344, 72, 276, 76, 212],
    [72, 158, 64, 78, 82, 54],
    [104, 46, 134, 108, 148, 172],
    [178, 132, 218, 82, 252, 58],
    [266, 52, 278, 52, 288, 58],
  ],
};

/**
 * Concept 2 ("skater") final architectural capital K contour (at morph = 1.0):
 * Identical outer K geometry to K_TUCKED_FINAL, with segment topology shifted by 1 limb.
 */
const K_SKATER_FINAL: ContourShape = {
  start: [296, 52],
  segments: [
    [304, 58, 250, 132, 196, 194],
    [232, 242, 268, 292, 288, 322],
    [294, 330, 300, 338, 304, 346],
    [280, 346, 256, 346, 234, 346],
    [202, 306, 168, 264, 134, 222],
    [134, 346, 134, 346, 66, 346],
    [66, 300, 66, 254, 66, 208],
    [66, 156, 66, 104, 66, 52],
    [134, 52, 134, 52, 134, 178],
    [172, 136, 212, 92, 250, 52],
    [266, 52, 282, 52, 296, 52],
  ],
};

const smootherstep = (value: number) => {
  const t = clamp(value, 0, 1);
  return t * t * t * (t * (6 * t - 15) + 10);
};

/**
 * Rig pose that coils Star Ember toward the chosen K concept before/during the contour morph.
 */
export function emberKCharacterPose(concept: EmberKConcept, morph: number): EmberPose {
  const t = smootherstep(morph);
  if (concept === "skater") {
    return {
      ...EMBER_REST,
      crest: 0.72 * t,
      armLeft: 1.0 * t,
      armRight: -0.88 * t,
      legLeft: 0.42 * t,
      legRight: -0.62 * t,
      wind: 0.78 * t,
      rotation: 16 * t,
      lookX: 0.45 * t,
      lookY: -0.15 * t,
      eyeLeft: 1 - 0.25 * t,
      eyeRight: 1 - 0.25 * t,
      smile: 1 - 0.65 * t,
    };
  }
  return {
    ...EMBER_REST,
    crest: -0.32 * t,
    armLeft: -0.96 * t,
    armRight: 0.95 * t,
    legLeft: 0.28 * t,
    legRight: -0.58 * t,
    wind: 0.52 * t,
    rotation: -4 * t,
    lookX: 0.2 * t,
    lookY: 0,
    eyeLeft: 1 - 0.2 * t,
    eyeRight: 1 - 0.2 * t,
    smile: 1 - 0.45 * t,
  };
}

function sampleMorphedPoint(
  baseX: number,
  baseY: number,
  midX: number,
  midY: number,
  finalX: number,
  finalY: number,
  p: EmberPose,
  kMorph: number,
): [number, number] {
  const m = clamp(kMorph, 0, 1);
  const [dx, dy] = deformEmberPoint(baseX, baseY, p);
  // Fold body transform into the point so at kMorph = 1 the K lands in exact viewBox space.
  const yawScale = Math.cos(p.yaw * 1.12);
  const rad = (p.rotation * Math.PI) / 180;
  const lx = (dx - 180) * p.scaleX * yawScale;
  const ly = (dy - 235) * p.scaleY;
  const posedX = 180 + p.x + lx * Math.cos(rad) - ly * Math.sin(rad);
  const posedY = 235 + p.y + lx * Math.sin(rad) + ly * Math.cos(rad);
  if (m <= 0) return [posedX, posedY];
  if (m >= 1) return [finalX, finalY];
  // Two-stage C1 spline through the organic character-K silhouette at m = 0.46.
  const pivot = 0.46;
  if (m < pivot) {
    const u = smootherstep(m / pivot);
    return [posedX + (midX - posedX) * u, posedY + (midY - posedY) * u];
  }
  const u = smootherstep((m - pivot) / (1 - pivot));
  return [midX + (finalX - midX) * u, midY + (finalY - midY) * u];
}

export function emberKMorphPoints(
  pose: EmberPose,
  kMorph: number,
  concept: EmberKConcept = "skater",
): { start: [number, number]; segments: [number, number, number, number, number, number][] } {
  const mid = concept === "skater" ? K_SKATER_MID : K_TUCKED_MID;
  const final = concept === "skater" ? K_SKATER_FINAL : K_TUCKED_FINAL;
  const start = sampleMorphedPoint(
    EMBER_MODEL.start[0],
    EMBER_MODEL.start[1],
    mid.start[0],
    mid.start[1],
    final.start[0],
    final.start[1],
    pose,
    kMorph,
  );
  const segments = EMBER_MODEL.body.map((s, i) => {
    const ms = mid.segments[i]!;
    const fs = final.segments[i]!;
    const c1 = sampleMorphedPoint(s[0], s[1], ms[0], ms[1], fs[0], fs[1], pose, kMorph);
    const c2 = sampleMorphedPoint(s[2], s[3], ms[2], ms[3], fs[2], fs[3], pose, kMorph);
    const end = sampleMorphedPoint(s[4], s[5], ms[4], ms[5], fs[4], fs[5], pose, kMorph);
    return [c1[0], c1[1], c2[0], c2[1], end[0], end[1]] as [number, number, number, number, number, number];
  });
  return { start, segments };
}

export function emberKMorphContour(
  pose: EmberPose,
  kMorph: number,
  concept: EmberKConcept = "skater",
): string {
  if (kMorph <= 0) return emberContour(pose, false);
  const { start, segments } = emberKMorphPoints(pose, kMorph, concept);
  const pt = (x: number, y: number) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  return `M ${pt(start[0], start[1])} ${segments
    .map((s) => `C ${pt(s[0], s[1])} ${pt(s[2], s[3])} ${pt(s[4], s[5])}`)
    .join(" ")} Z`;
}

export function emberKMorphSideWalls(
  pose: EmberPose,
  kMorph: number,
  concept: EmberKConcept = "skater",
): string {
  if (kMorph <= 0) return emberSideWalls(pose);
  const extrudeScale = 1 - smootherstep(clamp(kMorph / 0.82, 0, 1));
  const [rawDx, rawDy] = emberDepthOffset(pose);
  const dx = rawDx * extrudeScale;
  const dy = rawDy * extrudeScale;
  const { start: initStart, segments } = emberKMorphPoints(pose, kMorph, concept);
  const point = ([x, y]: readonly number[]) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  const back = ([x, y]: readonly number[]) => [x + dx, y + dy];
  let start: [number, number] = initStart;
  return segments
    .map((s) => {
      const c1: [number, number] = [s[0], s[1]];
      const c2: [number, number] = [s[2], s[3]];
      const end: [number, number] = [s[4], s[5]];
      const outward = (end[1] - start[1]) * dx - (end[0] - start[0]) * dy > 0;
      const wall = outward
        ? `M ${point(start)} C ${point(c1)} ${point(c2)} ${point(end)} L ${point(back(end))} C ${point(back(c2))} ${point(back(c1))} ${point(back(start))} Z`
        : `M ${point(end)} C ${point(c2)} ${point(c1)} ${point(start)} L ${point(back(start))} C ${point(back(c1))} ${point(back(c2))} ${point(back(end))} Z`;
      start = end;
      return wall;
    })
    .join(" ");
}

