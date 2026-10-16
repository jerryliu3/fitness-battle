import { describe, expect, it } from "vitest";
import {
  BOOT_DURATION_MS,
  FLIGHT_END,
  READY_END,
  bootEmberPose,
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
    expect(bootFrame(1, layout).morph).toBe(1);
  });

  it("banks and streams the crest with the measured journey, then returns to rest", () => {
    const p = .6;
    const pose = bootEmberPose(p, { frame: bootFrame(p, layout) });
    expect(pose.wind).toBeGreaterThan(.8);
    expect(pose.crest).toBeGreaterThan(.8);
    expect(pose.depth).toBeGreaterThan(.5);
    expect(bootEmberPose(1).wind).toBe(0);
  });

  it("starts standing and settles ready for the K morph", () => {
    const start = bootEmberPose(0);
    expect(start.armLeft).toBeCloseTo(0);
    expect(start.armRight).toBeCloseTo(0);
    const ready = bootEmberPose(READY_END);
    expect(ready.armLeft).toBeCloseTo(0);
    expect(ready.armRight).toBeCloseTo(0);
  });
});
