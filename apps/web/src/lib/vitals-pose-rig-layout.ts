import type { VitalsPoseBoneLabel, VitalsPoseRot } from "@/lib/vitals-pose";

export type RigRegion = "torso" | "armL" | "armR" | "legL" | "legR";

export type RigBoneAxis = "up" | "down" | "outL" | "outR" | "fwd";

export type RigBoneId = VitalsPoseBoneLabel | "hips" | "spine" | "chest" | "hand.L" | "hand.R";

export type RigBoneDef = {
  id: RigBoneId;
  parent: RigBoneId | null;
  length: number;
  /** Parent-local offset from parent distal joint (along parent segment axis × length). */
  offset: [number, number, number];
  axis: RigBoneAxis;
  region: RigRegion;
};

export type RigSide = "torso" | "left" | "right";

/** High-contrast L/R (same hue on arm + leg each side). */
export const RIG_SIDE_COLORS: Record<RigSide, number> = {
  torso: 0xc4cdd6,
  left: 0xff2d9a,
  right: 0x19c3ff,
};

export const RIG_SIDE_LABELS: Record<RigSide, string> = {
  torso: "Torso",
  left: "LEFT (.L bones)",
  right: "RIGHT (.R bones)",
};

export function rigSide(region: RigRegion): RigSide {
  if (region === "torso") return "torso";
  return region.endsWith("L") ? "left" : "right";
}

const AXIS_UNIT: Record<RigBoneAxis, [number, number, number]> = {
  up: [0, 1, 0],
  down: [0, -1, 0],
  outL: [1, 0, 0],
  outR: [-1, 0, 0],
  fwd: [0, 0, -1],
};

export function segmentUnit(axis: RigBoneAxis): [number, number, number] {
  return AXIS_UNIT[axis];
}

/** Parent-local position for a child joint at the parent segment tip. */
export function childAttachLocal(
  parent: RigBoneDef,
  childOffset: [number, number, number] = [0, 0, 0],
): [number, number, number] {
  const [ux, uy, uz] = segmentUnit(parent.axis);
  const [ox, oy, oz] = childOffset;
  return [ox + ux * parent.length, oy + uy * parent.length, oz + uz * parent.length];
}

export type RigLimbSegment = "upperArm" | "forearm" | "hand" | "leg" | "torso" | "other";

export function rigLimbSegment(id: RigBoneId): RigLimbSegment {
  if (id === "upperarm01.L" || id === "upperarm01.R" || id === "upperarm02.L" || id === "upperarm02.R") {
    return "upperArm";
  }
  if (id === "lowerarm01.L" || id === "lowerarm01.R") return "forearm";
  if (id === "hand.L" || id === "hand.R") return "hand";
  if (id.startsWith("upperleg")) return "leg";
  if (id === "hips" || id === "spine" || id === "chest") return "torso";
  return "other";
}

/**
 * Anny pose sliders are bone-local rotation vectors (deg): direction × angle, not Euler X/Y/Z.
 * Must match `roma.rotvec_to_rotmat(torch.deg2rad(...))` in the Python pipeline.
 */
export function rotvecDegComponents(rot: VitalsPoseRot | undefined): [number, number, number] {
  const r = rot ?? { x: 0, y: 0, z: 0 };
  return [r.x, r.y, r.z];
}

/** @deprecated Stick rig uses rotvec; kept for any legacy callers. */
export function eulerRad(rot: VitalsPoseRot | undefined) {
  const [x, y, z] = rotvecDegComponents(rot);
  return [(x * Math.PI) / 180, (y * Math.PI) / 180, (z * Math.PI) / 180] as const;
}

export function isTunableBone(id: RigBoneId): id is VitalsPoseBoneLabel {
  return id !== "hips" && id !== "spine" && id !== "chest" && id !== "hand.L" && id !== "hand.R";
}

/** Y-up stick figure; face −Z. Rest pose ≈ wide shoulders, arms hang, then Anny rotvec poses. */
export const POSE_RIG_BONES: RigBoneDef[] = [
  { id: "hips", parent: null, length: 0, offset: [0, 0, 0], axis: "up", region: "torso" },
  { id: "spine", parent: "hips", length: 0.5, offset: [0, 0, 0], axis: "up", region: "torso" },
  { id: "chest", parent: "spine", length: 0.34, offset: [0, 0, 0], axis: "up", region: "torso" },
  { id: "clavicle.L", parent: "chest", length: 0.12, offset: [0.06, 0, 0], axis: "outL", region: "armL" },
  { id: "shoulder01.L", parent: "clavicle.L", length: 0.05, offset: [0, 0, 0], axis: "outL", region: "armL" },
  { id: "upperarm01.L", parent: "shoulder01.L", length: 0.3, offset: [0, 0, 0], axis: "down", region: "armL" },
  { id: "upperarm02.L", parent: "upperarm01.L", length: 0.26, offset: [0, 0, 0], axis: "down", region: "armL" },
  { id: "lowerarm01.L", parent: "upperarm02.L", length: 0.24, offset: [0, 0, 0], axis: "down", region: "armL" },
  { id: "hand.L", parent: "lowerarm01.L", length: 0.1, offset: [0, 0, 0], axis: "down", region: "armL" },
  { id: "clavicle.R", parent: "chest", length: 0.12, offset: [-0.06, 0, 0], axis: "outR", region: "armR" },
  { id: "shoulder01.R", parent: "clavicle.R", length: 0.05, offset: [0, 0, 0], axis: "outR", region: "armR" },
  { id: "upperarm01.R", parent: "shoulder01.R", length: 0.3, offset: [0, 0, 0], axis: "down", region: "armR" },
  { id: "upperarm02.R", parent: "upperarm01.R", length: 0.26, offset: [0, 0, 0], axis: "down", region: "armR" },
  { id: "lowerarm01.R", parent: "upperarm02.R", length: 0.24, offset: [0, 0, 0], axis: "down", region: "armR" },
  { id: "hand.R", parent: "lowerarm01.R", length: 0.1, offset: [0, 0, 0], axis: "down", region: "armR" },
  { id: "upperleg01.L", parent: "hips", length: 0.48, offset: [0.1, 0, 0], axis: "down", region: "legL" },
  { id: "upperleg01.R", parent: "hips", length: 0.48, offset: [-0.1, 0, 0], axis: "down", region: "legR" },
];

export function parentBone(id: RigBoneId) {
  return POSE_RIG_BONES.find((b) => b.id === id)?.parent ?? null;
}
