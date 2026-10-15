/** Star Ember v1. Coordinate space, palette and contours are shared by every renderer. */
export const EMBER_MODEL = {
  version: 1,
  viewBox: "0 -45 360 445",
  width: 360,
  height: 445,
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
}

export const EMBER_REST: Readonly<EmberPose> = Object.freeze({
  x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
  yaw: 0, crest: 0, armLeft: 0, armRight: 0, legLeft: 0, legRight: 0,
  lookX: 0, lookY: 0, eyeLeft: 1, eyeRight: 1, mouthOpen: 0, smile: 1,
  sparkle: 0, trail: 0,
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
  for (const key of ["eyeLeft", "eyeRight", "mouthOpen", "sparkle", "trail"] as const) p[key] = clamp(p[key], 0, 1);
  p.scaleX = clamp(p.scaleX, 0.65, 1.35);
  p.scaleY = clamp(p.scaleY, 0.65, 1.35);
  p.x = clamp(p.x, -45, 45); p.y = clamp(p.y, -90, 15);
  p.rotation = clamp(p.rotation, -35, 35);
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

/** Smooth weights bend points and handles together; no detached arm/leg sprite pieces. */
export function deformEmberPoint(x: number, y: number, p: EmberPose): [number, number] {
  const crest = Math.max(0, (152 - y) / 100) ** 2;
  // A flat weight across the arm's tip preserves its tangent when raised.
  const armBand = Math.max(0, 1 - Math.max(0, y - 200) / 70);
  const left = clamp((145 - x) / 100, 0, 1) * armBand;
  const right = clamp((x - 217) / 91, 0, 1) * armBand;
  const foot = Math.max(0, (y - 250) / 100);
  const legL = Math.max(0, (182 - x) / 83) * foot;
  const legR = Math.max(0, (x - 182) / 83) * foot;
  return [
    x - p.crest * 33 * crest + p.armLeft * 9 * left - p.armRight * 9 * right + p.legLeft * 29 * legL - p.legRight * 29 * legR,
    y + p.crest * 8 * crest - p.armLeft * 58 * left - p.armRight * 58 * right - p.legLeft * 37 * legL - p.legRight * 37 * legR,
  ];
}

export function emberContour(pose: EmberPose, crescent = false): string {
  const start = crescent ? EMBER_MODEL.crescentStart : EMBER_MODEL.start;
  const segments = crescent ? EMBER_MODEL.crescent : EMBER_MODEL.body;
  const point = (x: number, y: number) => deformEmberPoint(x, y, pose).map(v => v.toFixed(2)).join(" ");
  return `M ${point(...start)} ${segments.map(s => `C ${point(s[0], s[1])} ${point(s[2], s[3])} ${point(s[4], s[5])}`).join(" ")} Z`;
}
