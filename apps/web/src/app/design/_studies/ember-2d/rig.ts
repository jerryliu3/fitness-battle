import { frameAt, smooth } from "../overtaek-lab/motion";

export interface Pose {
  turn: number;
  drive: number;
  tip: number;
  limb: number;
  celebrate: number;
}

export const FRONT: Pose = { turn: 0, drive: 0, tip: 0, limb: 0, celebrate: 0 };
export const poseLibrary = [
  { name: "Front", detail: "Balanced points · quiet smile", pose: FRONT },
  { name: "45° turn", detail: "Face and far eye shift", pose: { ...FRONT, turn: 1 } },
  { name: "Flying", detail: "Swept points · wind in the crest", pose: { ...FRONT, turn: 1, drive: 1, tip: .52, limb: .12 } },
  { name: "Braking", detail: "Points open · crest rebounds", pose: { ...FRONT, turn: .65, tip: -.11, limb: -.025 } },
  { name: "Finish", detail: "Arms lift · happy landing", pose: { ...FRONT, celebrate: 1 } },
] as const;

/** Traced proportions of the supplied front pose, in a 320 × 360 view box.
 * The four ordinary points mirror around x=160. Only the hair crest differs.
 * A single connected contour prevents seams as each point bends independently.
 */
const outline = "M 112 24 C 93 25 120 38 122 53 C 132 74 111 101 104 122 C 77 127 30 131 24 143 C 19 157 54 193 80 210 C 77 244 73 319 86 334 C 96 345 130 299 152 282 C 157 278 163 278 168 282 C 190 299 224 345 234 334 C 247 319 243 244 240 210 C 266 193 301 157 296 143 C 290 131 243 127 216 122 C 214 80 198 50 171 32 C 153 24 129 21 112 24 Z";

const influence = (x: number, y: number, cx: number, cy: number, radius: number) => Math.max(0, 1 - Math.hypot(x - cx, y - cy) / radius) ** 2;

/** Local deformation fields bend the four points around their attached roots. */
export function deformPoint(x: number, y: number, pose: Pose): [number, number] {
  const left = influence(x, y, 24, 143, 98), right = influence(x, y, 296, 143, 98);
  const lowerLeft = influence(x, y, 86, 334, 105), lowerRight = influence(x, y, 234, 334, 105);
  const hair = Math.max(0, (122 - y) / 100) ** 2;
  const { drive, tip, limb, celebrate, turn } = pose;
  return [
    x + left * (-16 * drive - 22 * limb + turn * 9)
      + right * (6 * drive - 30 * limb - turn * 7)
      + lowerLeft * (-16 * drive - 75 * limb + turn * 7)
      + lowerRight * (-8 * drive - 95 * limb - turn * 4) - hair * tip * 67,
    y + left * (-6 * drive + 30 * limb - 33 * celebrate)
      + right * (-20 * drive + 20 * limb - 40 * celebrate)
      + lowerLeft * (-24 * drive - 35 * limb) + lowerRight * (-7 * drive + 35 * limb)
      + hair * tip * 30,
  ];
}

export function flightPoseAt(progress: number): Pose {
  const f = frameAt(progress);
  return {
    turn: smooth((progress - .10) / .18) * (1 - smooth((progress - .75) / .18)),
    drive: f.speed, tip: f.tip, limb: f.limb,
    celebrate: smooth((progress - .82) / .12) * (1 - smooth((progress - .94) / .06)),
  };
}

export function rigAt(pose: Pose = FRONT) {
  const path = outline.replace(/(-?\d+) (-?\d+)/g, (_, a: string, b: string) => {
    const [x, y] = deformPoint(Number(a), Number(b), pose);
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  });
  const open = Math.max(pose.drive, pose.celebrate);
  return {
    path,
    body: `translate(160 180) scale(${1 - pose.turn * .17} ${1 - pose.drive * .055}) translate(-160 -180)`,
    face: `translate(${pose.turn * 17} ${-pose.drive * 3})`,
    farEye: `translate(${126 + pose.turn * 5} 176) scale(${1 - pose.turn * .25} 1) translate(-126 -176)`,
    mouth: open > .25 ? "M 146 198 Q 160 202 176 196 C 177 220 149 225 146 198 Z" : "M 149 197 Q 160 210 173 197",
    open,
  };
}
