import { describe, expect, it } from "vitest";
import {
  BOOT_DURATION_MS,
  READY_END,
  ZOOM_END,
  bootDashProgress,
  bootEmberPose,
  bootFrame,
  bootKMorph,
  isCompeteDataReady,
  shouldShowBootSplash,
} from "./index";

describe("boot gate", () => {
  it("treats loading with no state as not ready", () => {
    expect(isCompeteDataReady("loading", null)).toBe(false);
    expect(isCompeteDataReady("loading", undefined)).toBe(false);
    expect(isCompeteDataReady("ready", null)).toBe(true);
    expect(isCompeteDataReady("loading", {})).toBe(true);
    expect(isCompeteDataReady("local", null)).toBe(true);
    expect(isCompeteDataReady("failed", null)).toBe(true);
  });

  it("holds the splash until animation and data are both done", () => {
    expect(shouldShowBootSplash(true, false)).toBe(true);
    expect(shouldShowBootSplash(false, true)).toBe(true);
    expect(shouldShowBootSplash(false, false)).toBe(true);
    expect(shouldShowBootSplash(true, true)).toBe(false);
  });
});

describe("boot splash motion", () => {
  it("holds travel through a long ready, then jumps during a short zoom", () => {
    expect(BOOT_DURATION_MS).toBe(1600);
    expect(READY_END).toBeGreaterThan(0.6);
    expect(ZOOM_END - READY_END).toBeLessThan(0.25);
    expect(bootFrame(0).travel).toBe(0);
    expect(bootFrame(0.5).travel).toBe(0);
    expect(bootFrame(READY_END).travel).toBe(0);
    expect(bootFrame((READY_END + ZOOM_END) / 2).travel).toBeGreaterThan(0.3);
    expect(bootFrame(ZOOM_END).travel).toBe(1);
    expect(bootFrame(1).travel).toBe(1);
    expect(bootFrame(1).phase).toBe("OVERTAEK");
  });

  it("maps ready to dash windup and the zoom to the dash burst", () => {
    expect(bootDashProgress(0)).toBe(0);
    expect(bootDashProgress(READY_END)).toBeCloseTo(0.22);
    expect(bootDashProgress(ZOOM_END)).toBeCloseTo(0.76);
    expect(bootDashProgress(1)).toBe(1);
  });

  it("morphs from standing rest into a K silhouette before the zoom", () => {
    expect(bootKMorph(0)).toBe(0);
    expect(bootKMorph(0.02)).toBe(0);
    expect(bootKMorph(READY_END * 0.5)).toBeGreaterThan(0.2);
    expect(bootKMorph(READY_END)).toBe(1);

    const start = bootEmberPose(0);
    expect(start.armLeft).toBeCloseTo(0);
    expect(start.armRight).toBeCloseTo(0);
    expect(start.wind).toBeCloseTo(0);

    const mid = bootEmberPose(READY_END * 0.5);
    expect(mid.armLeft).toBeLessThan(-0.2);
    expect(mid.armRight).toBeGreaterThan(0.2);

    const ready = bootEmberPose(READY_END);
    expect(ready.armLeft).toBeCloseTo(-1);
    expect(ready.armRight).toBeGreaterThan(0.7);

    const end = bootEmberPose(1);
    expect(end.armLeft).toBeCloseTo(-1);
    expect(end.armRight).toBeGreaterThan(0.85);
  });
});
