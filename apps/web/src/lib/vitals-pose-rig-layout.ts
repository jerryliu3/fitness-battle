import type { VitalsPoseBoneLabel, VitalsPoseRot } from "@/lib/vitals-pose";

export type RigRegion = "torso" | "armL" | "armR" | "legL" | "legR";

export type RigBoneDef = {
  id: VitalsPoseBoneLabel | "hips" | "spine" | "chest";
  parent: RigBoneDef["id"] | null;
  length: number;
  /** Extra offset from parent joint (meters). */
  offset: [number, number, number];
  /** Segment grows along +Y or -Y in bone local space. */
  axis: "up" | "down";
  region: RigRegion;
};

export const RIG_REGION_COLORS: Record<RigRegion, number> = {
  torso: 0x9aa8b5,
  armL: 0xffc857,
  armR: 0xffa94d,
  legL: 0x5eb3ff,
  legR: 0x4a9ef0,
};

export const RIG_REGION_LABELS: Record<RigRegion, string> = {
  torso: "Torso",
  armL: "Left arm",
  armR: "Right arm",
  legL: "Left leg",
  legR: "Right leg",
};

/** Y-up stick figure (~1.7m). Children attach at parent tip. */
export const POSE_RIG_BONES: RigBoneDef[] = [
  { id: "hips", parent: null, length: 0, offset: [0, 0, 0], axis: "up", region: "torso" },
  { id: "spine", parent: "hips", length: 0.5, offset: [0, 0, 0], axis: "up", region: "torso" },
  { id: "chest", parent: "spine", length: 0.38, offset: [0, 0, 0], axis: "up", region: "torso" },
  { id: "clavicle.L", parent: "chest", length: 0.12, offset: [0.08, 0.38, 0], axis: "up", region: "armL" },
  { id: "shoulder01.L", parent: "clavicle.L", length: 0.06, offset: [0, 0, 0], axis: "up", region: "armL" },
  { id: "upperarm01.L", parent: "shoulder01.L", length: 0.32, offset: [0, 0, 0], axis: "down", region: "armL" },
  { id: "upperarm02.L", parent: "upperarm01.L", length: 0.28, offset: [0, 0, 0], axis: "down", region: "armL" },
  { id: "lowerarm01.L", parent: "upperarm02.L", length: 0.26, offset: [0, 0, 0], axis: "down", region: "armL" },
  { id: "clavicle.R", parent: "chest", length: 0.12, offset: [-0.08, 0.38, 0], axis: "up", region: "armR" },
  { id: "shoulder01.R", parent: "clavicle.R", length: 0.06, offset: [0, 0, 0], axis: "up", region: "armR" },
  { id: "upperarm01.R", parent: "shoulder01.R", length: 0.32, offset: [0, 0, 0], axis: "down", region: "armR" },
  { id: "upperarm02.R", parent: "upperarm01.R", length: 0.28, offset: [0, 0, 0], axis: "down", region: "armR" },
  { id: "lowerarm01.R", parent: "upperarm02.R", length: 0.26, offset: [0, 0, 0], axis: "down", region: "armR" },
  { id: "upperleg01.L", parent: "hips", length: 0.48, offset: [0.11, 0, 0], axis: "down", region: "legL" },
  { id: "upperleg01.R", parent: "hips", length: 0.48, offset: [-0.11, 0, 0], axis: "down", region: "legR" },
];

export function isTunableBone(id: RigBoneDef["id"]): id is VitalsPoseBoneLabel {
  return id !== "hips" && id !== "spine" && id !== "chest";
}

export function eulerRad(rot: VitalsPoseRot | undefined) {
  const r = rot ?? { x: 0, y: 0, z: 0 };
  return [(r.x * Math.PI) / 180, (r.y * Math.PI) / 180, (r.z * Math.PI) / 180] as const;
}

export function parentBone(id: RigBoneDef["id"]) {
  return POSE_RIG_BONES.find((b) => b.id === id)?.parent ?? null;
}
