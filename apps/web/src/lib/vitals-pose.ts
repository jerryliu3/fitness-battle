/** Anny standing-pose bone overrides (degrees, bone-local). Anny mesh source only. */

export type VitalsPoseRot = { x: number; y: number; z: number };

export const VITALS_POSE_BONES = [
  "clavicle.L",
  "clavicle.R",
  "shoulder01.L",
  "shoulder01.R",
  "upperarm01.L",
  "upperarm01.R",
  "upperarm02.L",
  "upperarm02.R",
  "lowerarm01.L",
  "lowerarm01.R",
  "upperleg01.L",
  "upperleg01.R",
] as const;

export type VitalsPoseBoneLabel = (typeof VITALS_POSE_BONES)[number];

export type VitalsPoseFile = Partial<Record<VitalsPoseBoneLabel, VitalsPoseRot>>;

/** Checked-in defaults; must stay aligned with `mesh_common._default_standing_pose()`. */
export const DEFAULT_VITALS_POSE: Record<VitalsPoseBoneLabel, VitalsPoseRot> = {
  "clavicle.L": { x: 0, y: 0, z: 5 },
  "clavicle.R": { x: 0, y: 0, z: -5 },
  "shoulder01.L": { x: 0, y: 0, z: 7 },
  "shoulder01.R": { x: 0, y: 0, z: -7 },
  "upperarm01.L": { x: -18, y: 0, z: -76 },
  "upperarm01.R": { x: -18, y: 0, z: 76 },
  "upperarm02.L": { x: 0, y: 0, z: 0 },
  "upperarm02.R": { x: 0, y: 0, z: 0 },
  "lowerarm01.L": { x: 0, y: 0, z: 0 },
  "lowerarm01.R": { x: 0, y: 0, z: 0 },
  "upperleg01.L": { x: 0, y: 0, z: -7 },
  "upperleg01.R": { x: 0, y: 0, z: 7 },
};

const AXIS_LIMIT = 120;

function clampDeg(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(-AXIS_LIMIT, Math.min(AXIS_LIMIT, n));
}

export function normalizePoseRot(input: Partial<VitalsPoseRot> | undefined, base: VitalsPoseRot): VitalsPoseRot {
  return {
    x: clampDeg(input?.x ?? base.x),
    y: clampDeg(input?.y ?? base.y),
    z: clampDeg(input?.z ?? base.z),
  };
}

export function mergePoseFile(
  input: VitalsPoseFile | undefined,
  base: Record<VitalsPoseBoneLabel, VitalsPoseRot> = DEFAULT_VITALS_POSE,
): Record<VitalsPoseBoneLabel, VitalsPoseRot> {
  const out = { ...base };
  if (!input) return out;
  for (const bone of VITALS_POSE_BONES) {
    if (input[bone]) {
      out[bone] = normalizePoseRot(input[bone], base[bone]);
    }
  }
  return out;
}
