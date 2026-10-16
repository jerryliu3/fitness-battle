import { describe, expect, it } from "vitest";
import {
  BOOT_DURATION_MS,
  FLIGHT_END,
  READY_END,
  bootEmberPose,
  bootFlightT,
  bootFrame,
  bootKCrossfade,
  bootKMorph,
  isCompeteDataReady,
  shouldShowBootSplash,
} from "./index";

const layout = { overtaWidth: 180, slotWidth: 45, eWidth: 28, font: 50 };

describe("boot gate", () => {
  it("treats loading with no state as not ready", () => {
    expect(isCompeteDataReady("loading", null)).toBe(false);
    expect(isCompeteDataReady("ready", null)).toBe(true);
    expect(isCompeteDataReady("loading", {})).toBe(true);
  });

  it("holds the splash until animation and data are both done", () => {
    expect(shouldShowBootSplash(true, false)).toBe(true);
    expect(shouldShowBootSplash(false, true)).toBe(true);
    expect(shouldShowBootSplash(true, true)).toBe(false);
  });
});

describe("boot flight path", () => {
  it("holds at the slot through ready, then flies a long loop before settle", () => {
    expect(BOOT_DURATION_MS).toBeGreaterThanOrEqual(2800);
    expect(READY_END).toBeLessThan(0.3);
    expect(FLIGHT_END - READY_END).toBeGreaterThan(0.5);

    const ready = bootFrame(READY_END * 0.5, layout);
    expect(ready.phase).toBe("Ready");
    expect(ready.travel).toBe(0);
    expect(Math.abs(ready.x)).toBeLessThan(layout.font * 0.15);

    const behind = bootFrame(READY_END + (FLIGHT_END - READY_END) * 0.3, layout);
    expect(behind.phase).toBe("Flight");
    expect(behind.x).toBeLessThan(-layout.overtaWidth * 0.4);
    expect(behind.depth).toBeLessThan(0);

    const aroundO = bootFrame(READY_END + (FLIGHT_END - READY_END) * 0.48, layout);
    expect(aroundO.x).toBeLessThan(-layout.overtaWidth * 0.7);

    const front = bootFrame(READY_END + (FLIGHT_END - READY_END) * 0.7, layout);
    expect(front.depth).toBeGreaterThan(0.5);
    expect(front.facing).toBe(1);

    const end = bootFrame(1, layout);
    expect(end.phase).toBe("OVERTAEK");
    expect(end.x).toBeCloseTo(layout.eWidth, 0);
    expect(end.kOpacity).toBe(1);
    expect(end.emberOpacity).toBe(0);
    expect(end.eShift).toBe(1);
  });

  it("crossfades Ember into K only after the flight lands", () => {
    expect(bootKCrossfade(FLIGHT_END)).toBe(0);
    expect(bootKCrossfade((FLIGHT_END + 1) / 2)).toBeGreaterThan(0.2);
    expect(bootKCrossfade(1)).toBe(1);
    expect(bootFlightT(READY_END)).toBe(0);
    expect(bootFlightT(FLIGHT_END)).toBe(1);
  });

  it("morphs from standing rest into a K silhouette before launch", () => {
    expect(bootKMorph(0)).toBe(0);
    expect(bootKMorph(READY_END)).toBe(1);
    const start = bootEmberPose(0);
    expect(start.armLeft).toBeCloseTo(0);
    expect(start.armRight).toBeCloseTo(0);
    const ready = bootEmberPose(READY_END);
    expect(ready.armLeft).toBeCloseTo(-1);
    expect(ready.armRight).toBeGreaterThan(0.7);
    const midFlight = bootEmberPose(READY_END + (FLIGHT_END - READY_END) * 0.5);
    expect(midFlight.trail).toBeGreaterThan(0.3);
  });
});
