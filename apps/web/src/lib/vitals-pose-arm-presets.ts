import {
  DEFAULT_VITALS_POSE,
  LEGACY_PIPELINE_POSE,
  mergePoseFile,
  VITALS_POSE_BONES,
  type VitalsPoseFile,
} from "@/lib/vitals-pose";

export type VitalsPosePreset = { id: string; label: string; hint: string; overrides: VitalsPoseFile };

const identity = Object.fromEntries(VITALS_POSE_BONES.map((label) => [label, { x: 0, y: 0, z: 0 }])) as VitalsPoseFile;

export const VITALS_ARM_AT_SIDE_PRESETS: VitalsPosePreset[] = [
  {
    id: "soldier",
    label: "Soldier · relaxed arms",
    hint: "Shipped pipeline default — relaxed straight arms, palms inward, feet slightly closer.",
    overrides: {},
  },
  {
    id: "legacy-pipeline",
    label: "Legacy pipeline (pre-Soldier)",
    hint: "Former default with arms forward (−76° upperarm Z).",
    overrides: LEGACY_PIPELINE_POSE,
  },
  {
    id: "reference",
    label: "Zero rotations",
    hint: "Anny reference pose with identity deltas; useful for checking axes.",
    overrides: identity,
  },
];

export function poseFromPreset(preset: VitalsPosePreset) {
  return mergePoseFile(preset.overrides, DEFAULT_VITALS_POSE);
}

export function findArmSidePreset(id: string) {
  return VITALS_ARM_AT_SIDE_PRESETS.find((preset) => preset.id === id);
}
