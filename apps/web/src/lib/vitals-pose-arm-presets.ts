import {
  DEFAULT_VITALS_POSE,
  mergePoseFile,
  type VitalsPoseBoneLabel,
  type VitalsPoseFile,
  type VitalsPoseRot,
} from "@/lib/vitals-pose";

export type VitalsPosePreset = {
  id: string;
  label: string;
  hint: string;
  overrides: VitalsPoseFile;
};

function arm(
  L: Partial<Record<`${string}.L`, VitalsPoseRot>>,
  R: Partial<Record<`${string}.R`, VitalsPoseRot>>,
): VitalsPoseFile {
  const out: VitalsPoseFile = {};
  for (const [key, rot] of Object.entries(L)) {
    out[key as VitalsPoseBoneLabel] = rot;
  }
  for (const [key, rot] of Object.entries(R)) {
    out[key as VitalsPoseBoneLabel] = rot;
  }
  return out;
}

/** Click-through guesses for arms down, palms facing inward. Mesh PNG picks the winner. */
export const VITALS_ARM_AT_SIDE_PRESETS: VitalsPosePreset[] = [
  {
    id: "repo-default",
    label: "1 · Repo default",
    hint: "Shipped standing pose baseline.",
    overrides: {},
  },
  {
    id: "hang-63",
    label: "2 · Hang ~63° Z",
    hint: "Near your manual Z hang; matching X on L/R.",
    overrides: arm(
      {
        "upperarm01.L": { x: 35, y: 0, z: -63 },
        "upperarm02.L": { x: 0, y: 0, z: 0 },
        "lowerarm01.L": { x: 0, y: 0, z: 0 },
      },
      {
        "upperarm01.R": { x: 35, y: 0, z: 63 },
        "upperarm02.R": { x: 0, y: 0, z: 0 },
        "lowerarm01.R": { x: 0, y: 0, z: 0 },
      },
    ),
  },
  {
    id: "hang-deep",
    label: "3 · Deeper hang",
    hint: "Stronger Z pull; arms closer to thighs.",
    overrides: arm(
      {
        "upperarm01.L": { x: 22, y: 0, z: -95 },
        "upperarm02.L": { x: 0, y: 0, z: 0 },
        "lowerarm01.L": { x: 0, y: 0, z: 0 },
      },
      {
        "upperarm01.R": { x: 22, y: 0, z: 95 },
        "upperarm02.R": { x: 0, y: 0, z: 0 },
        "lowerarm01.R": { x: 0, y: 0, z: 0 },
      },
    ),
  },
  {
    id: "hang-soft",
    label: "4 · Softer hang",
    hint: "Lighter Z; arms slightly away from ribs.",
    overrides: arm(
      {
        "upperarm01.L": { x: 28, y: 0, z: -48 },
        "upperarm02.L": { x: 0, y: 0, z: 0 },
        "lowerarm01.L": { x: 0, y: 0, z: 0 },
      },
      {
        "upperarm01.R": { x: 28, y: 0, z: 48 },
        "upperarm02.R": { x: 0, y: 0, z: 0 },
        "lowerarm01.R": { x: 0, y: 0, z: 0 },
      },
    ),
  },
  {
    id: "hang-63-palm-a",
    label: "5 · #2 + palm in (mild)",
    hint: "Preset 2 + light forearm twist toward body.",
    overrides: arm(
      {
        "upperarm01.L": { x: 35, y: 0, z: -63 },
        "upperarm02.L": { x: 0, y: 0, z: 0 },
        "lowerarm01.L": { x: 0, y: 32, z: 0 },
      },
      {
        "upperarm01.R": { x: 35, y: 0, z: 63 },
        "upperarm02.R": { x: 0, y: 0, z: 0 },
        "lowerarm01.R": { x: 0, y: -32, z: 0 },
      },
    ),
  },
  {
    id: "hang-63-palm-b",
    label: "6 · #2 + palm in (med)",
    hint: "Forearm Y + a little X for pronation.",
    overrides: arm(
      {
        "upperarm01.L": { x: 35, y: 0, z: -63 },
        "upperarm02.L": { x: 4, y: 0, z: -6 },
        "lowerarm01.L": { x: -22, y: 42, z: 6 },
      },
      {
        "upperarm01.R": { x: 35, y: 0, z: 63 },
        "upperarm02.R": { x: 4, y: 0, z: 6 },
        "lowerarm01.R": { x: 22, y: -42, z: -6 },
      },
    ),
  },
  {
    id: "hang-63-palm-c",
    label: "7 · #2 + palm in (strong)",
    hint: "Heavier forearm inward; check elbows in PNG.",
    overrides: arm(
      {
        "upperarm01.L": { x: 32, y: 0, z: -68 },
        "upperarm02.L": { x: 6, y: 0, z: -10 },
        "lowerarm01.L": { x: -38, y: 58, z: 8 },
      },
      {
        "upperarm01.R": { x: 32, y: 0, z: 68 },
        "upperarm02.R": { x: 6, y: 0, z: 10 },
        "lowerarm01.R": { x: 38, y: -58, z: -8 },
      },
    ),
  },
  {
    id: "shoulders-in",
    label: "8 · Shoulders rolled in",
    hint: "Quieter clavicle/shoulder Z + moderate hang.",
    overrides: {
      "clavicle.L": { x: 0, y: 0, z: 2 },
      "clavicle.R": { x: 0, y: 0, z: -2 },
      "shoulder01.L": { x: 0, y: 0, z: 3 },
      "shoulder01.R": { x: 0, y: 0, z: -3 },
      ...arm(
        {
          "upperarm01.L": { x: 30, y: 0, z: -72 },
          "upperarm02.L": { x: 0, y: 0, z: 0 },
          "lowerarm01.L": { x: -12, y: 36, z: 0 },
        },
        {
          "upperarm01.R": { x: 30, y: 0, z: 72 },
          "upperarm02.R": { x: 0, y: 0, z: 0 },
          "lowerarm01.R": { x: 12, y: -36, z: 0 },
        },
      ),
    },
  },
  {
    id: "combo-guess",
    label: "9 · Best guess combo",
    hint: "Blended hang + inward palm + slight upperarm02.",
    overrides: arm(
      {
        "upperarm01.L": { x: 38, y: 0, z: -70 },
        "upperarm02.L": { x: 8, y: 0, z: -12 },
        "lowerarm01.L": { x: -28, y: 45, z: 4 },
      },
      {
        "upperarm01.R": { x: 38, y: 0, z: 70 },
        "upperarm02.R": { x: 8, y: 0, z: 12 },
        "lowerarm01.R": { x: 28, y: -45, z: -4 },
      },
    ),
  },
  {
    id: "mesh-legacy",
    label: "10 · Legacy shipped Z",
    hint: "Original ±76° upperarm01 defaults.",
    overrides: arm(
      {
        "upperarm01.L": { x: -18, y: 0, z: -76 },
        "upperarm02.L": { x: 0, y: 0, z: 0 },
        "lowerarm01.L": { x: 0, y: 0, z: 0 },
      },
      {
        "upperarm01.R": { x: -18, y: 0, z: 76 },
        "upperarm02.R": { x: 0, y: 0, z: 0 },
        "lowerarm01.R": { x: 0, y: 0, z: 0 },
      },
    ),
  },
];

export function poseFromPreset(preset: VitalsPosePreset) {
  return mergePoseFile(preset.overrides, DEFAULT_VITALS_POSE);
}

export function findArmSidePreset(id: string): VitalsPosePreset | undefined {
  return VITALS_ARM_AT_SIDE_PRESETS.find((p) => p.id === id);
}
