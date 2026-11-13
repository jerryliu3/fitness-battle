import { describe, expect, it } from "vitest";
import { childAttachLocal, POSE_RIG_BONES } from "@/lib/vitals-pose-rig-layout";

describe("childAttachLocal", () => {
  it("places clavicle child along chest +Y tip", () => {
    const chest = POSE_RIG_BONES.find((b) => b.id === "chest")!;
    const clavicleL = POSE_RIG_BONES.find((b) => b.id === "clavicle.L")!;
    expect(childAttachLocal(chest, clavicleL.offset)).toEqual([
      0.11,
      chest.length,
      0,
    ]);
  });

  it("places shoulder along clavicle +X tip", () => {
    const clavicle = POSE_RIG_BONES.find((b) => b.id === "clavicle.L")!;
    expect(childAttachLocal(clavicle, [0, 0, 0])).toEqual([clavicle.length, 0, 0]);
  });
});
