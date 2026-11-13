import { describe, expect, it } from "vitest";
import { VITALS_POSE_BONES } from "@/lib/vitals-pose";
import { poseFromPreset, VITALS_ARM_AT_SIDE_PRESETS } from "@/lib/vitals-pose-arm-presets";

describe("VITALS_ARM_AT_SIDE_PRESETS", () => {
  it("includes the soldier preset", () => {
    expect(VITALS_ARM_AT_SIDE_PRESETS.some((preset) => preset.id === "soldier")).toBe(true);
  });

  it("each preset merges to a full bone map", () => {
    for (const preset of VITALS_ARM_AT_SIDE_PRESETS) {
      const bones = poseFromPreset(preset);
      for (const bone of VITALS_POSE_BONES) {
        expect(bones[bone]).toBeDefined();
      }
    }
  });
});
