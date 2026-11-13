import { DEFAULT_VITALS_POSE, mergePoseFile, VITALS_POSE_BONES, type VitalsPoseFile } from "@/lib/vitals-pose";

export type VitalsPosePreset = { id: string; label: string; hint: string; overrides: VitalsPoseFile };
const identity = Object.fromEntries(VITALS_POSE_BONES.map((label) => [label, { x: 0, y: 0, z: 0 }])) as VitalsPoseFile;

export const VITALS_ARM_AT_SIDE_PRESETS: VitalsPosePreset[] = [
  {
    id: "soldier",
    label: "Soldier · relaxed arms",
    hint: "Relaxed straight arms with clearance, palms inward and feet slightly closer. Checked against male and female Anny meshes.",
    overrides: {
      ...identity,
      "upperleg01.L": { x: 0, y: 3.3, z: 0 },
      "upperleg01.R": { x: 0, y: -3.3, z: 0 },
      "upperarm01.L": { x: 1.2, y: 32.5, z: 0.1 },
      "upperarm01.R": { x: 1.2, y: -32.5, z: -0.1 },
      "lowerarm01.L": { x: 32, y: 3.7, z: 27.2 },
      "lowerarm01.R": { x: 32, y: -3.7, z: -27.2 },
    },
  },
  { id: "repo-default", label: "Saved pipeline defaults", hint: "Existing pipeline baseline.", overrides: {} },
  { id: "reference", label: "Zero rotations", hint: "Anny reference pose with identity deltas; useful for checking axes.", overrides: identity },
];
export function poseFromPreset(preset: VitalsPosePreset) {
  return mergePoseFile(preset.overrides, DEFAULT_VITALS_POSE);
}
export function findArmSidePreset(id: string) {
  return VITALS_ARM_AT_SIDE_PRESETS.find((preset) => preset.id === id);
}
