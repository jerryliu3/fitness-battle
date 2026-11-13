import type { VitalsPoseBoneLabel, VitalsPoseRot } from "@/lib/vitals-pose";

export type RigBoneDef = {
  id: VitalsPoseBoneLabel | "hips" | "spine" | "chest";
  parent: RigBoneDef["id"] | null;
  length: number;
  /** Joint offset in parent space before bone segment (arm span, etc.). */
  offset: [number, number, number];
};

/** Stick figure for instant localhost feedback — not anatomically exact. */
export const POSE_RIG_BONES: RigBoneDef[] = [
  { id: "hips", parent: null, length: 0, offset: [0, 0, 0] },
  { id: "spine", parent: "hips", length: 0.42, offset: [0, 0, 0] },
  { id: "chest", parent: "spine", length: 0.32, offset: [0, 0, 0] },
  { id: "clavicle.L", parent: "chest", length: 0.11, offset: [0.06, 0.05, 0] },
  { id: "shoulder01.L", parent: "clavicle.L", length: 0.07, offset: [0, 0, 0] },
  { id: "upperarm01.L", parent: "shoulder01.L", length: 0.3, offset: [0, 0, 0] },
  { id: "upperarm02.L", parent: "upperarm01.L", length: 0.27, offset: [0, 0, 0] },
  { id: "lowerarm01.L", parent: "upperarm02.L", length: 0.25, offset: [0, 0, 0] },
  { id: "clavicle.R", parent: "chest", length: 0.11, offset: [-0.06, 0.05, 0] },
  { id: "shoulder01.R", parent: "clavicle.R", length: 0.07, offset: [0, 0, 0] },
  { id: "upperarm01.R", parent: "shoulder01.R", length: 0.3, offset: [0, 0, 0] },
  { id: "upperarm02.R", parent: "upperarm01.R", length: 0.27, offset: [0, 0, 0] },
  { id: "lowerarm01.R", parent: "upperarm02.R", length: 0.25, offset: [0, 0, 0] },
  { id: "upperleg01.L", parent: "hips", length: 0.44, offset: [0.1, 0, 0] },
  { id: "upperleg01.R", parent: "hips", length: 0.44, offset: [-0.1, 0, 0] },
];

export function isTunableBone(id: RigBoneDef["id"]): id is VitalsPoseBoneLabel {
  return id !== "hips" && id !== "spine" && id !== "chest";
}

export function eulerRad(rot: VitalsPoseRot | undefined) {
  const r = rot ?? { x: 0, y: 0, z: 0 };
  return [(r.x * Math.PI) / 180, (r.y * Math.PI) / 180, (r.z * Math.PI) / 180] as const;
}
