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
