import { describe, expect, it } from "vitest";
import { EMBER_CLIPS, sampleEmber } from "@fitness-battle/shared/mascot";
import {
  BOOT_DURATION_MS,
  FLIGHT_END,
  READY_END,
  bootEmberPose,
  bootFlyProgress,
  bootFrame,
} from "@fitness-battle/shared/boot";

const layout = { overtaWidth: 180, slotWidth: 45, eWidth: 28, font: 50 };

describe("boot splash flight", () => {
  it("holds through ready, then flies a long loop before settle", () => {
    expect(BOOT_DURATION_MS).toBeGreaterThanOrEqual(2800);
    expect(bootFrame(0.1, layout).phase).toBe("Ready");
    expect(bootFrame(0.1, layout).travel).toBe(0);
    const mid = bootFrame((READY_END + FLIGHT_END) / 2, layout);
    expect(mid.phase).toBe("Flight");
    expect(mid.travel).toBeGreaterThan(0.2);
    expect(bootFrame(1, layout).phase).toBe("OVERTAEK");
    expect(bootFrame(1, layout).kOpacity).toBe(1);
  });

  it("samples flyForward body language during the journey", () => {
    const mid = sampleEmber("flyForward", bootFlyProgress((READY_END + FLIGHT_END) / 2) * EMBER_CLIPS.flyForward.duration);
    const end = sampleEmber("flyForward", bootFlyProgress(1) * EMBER_CLIPS.flyForward.duration);
    expect(mid.trail).toBeGreaterThan(0.3);
    expect(end.x).toBeDefined();
  });

  it("starts standing and settles ready for the K crossfade", () => {
    const start = bootEmberPose(0);
    expect(start.armLeft).toBeCloseTo(0);
    expect(start.armRight).toBeCloseTo(0);
    const ready = bootEmberPose(READY_END);
    expect(ready.armLeft).toBeCloseTo(-1);
    expect(ready.armRight).toBeGreaterThan(0.7);
  });
});
