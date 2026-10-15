import { describe, expect, it } from "vitest";
import { EMBER_CLIPS, sampleEmber } from "@fitness-battle/shared/mascot";
import {
  BOOT_DURATION_MS,
  READY_END,
  ZOOM_END,
  bootDashProgress,
  bootEmberPose,
  bootFrame,
} from "@fitness-battle/shared/boot";

describe("boot splash dash sync", () => {
  it("holds travel through a long ready, then jumps during a short zoom", () => {
    expect(BOOT_DURATION_MS).toBe(1600);
    expect(bootFrame(0.2).travel).toBe(0);
    expect(bootFrame(0.2).phase).toBe("Ready");
    expect(bootFrame(READY_END).travel).toBe(0);
    expect(bootFrame((READY_END + ZOOM_END) / 2).travel).toBeGreaterThan(0.2);
    expect(bootFrame((READY_END + ZOOM_END) / 2).phase).toBe("Zoom");
    expect(bootFrame(0.95).travel).toBe(1);
    expect(bootFrame(1).phase).toBe("OVERTAEK");
  });

  it("maps ready to dash windup and the zoom to the dash burst", () => {
    const ready = sampleEmber("dash", bootDashProgress(0.2) * EMBER_CLIPS.dash.duration);
    const mid = sampleEmber("dash", bootDashProgress((READY_END + ZOOM_END) / 2) * EMBER_CLIPS.dash.duration);
    const end = sampleEmber("dash", bootDashProgress(1) * EMBER_CLIPS.dash.duration);
    expect(Math.abs(ready.x)).toBeGreaterThan(0);
    expect(mid.trail).toBeGreaterThan(0.5);
    expect(end.trail).toBe(0);
    expect(end.x).toBe(0);
  });

  it("starts standing and settles in a K pose with the upper arm raised", () => {
    const start = bootEmberPose(0);
    expect(start.armLeft).toBeCloseTo(0);
    expect(start.armRight).toBeCloseTo(0);
    const end = bootEmberPose(1);
    expect(end.armLeft).toBeCloseTo(-1);
    expect(end.armRight).toBeGreaterThan(0.85);
  });
});
