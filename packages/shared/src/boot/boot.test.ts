import { describe, expect, it } from "vitest";
import { BOOT_DURATION_MS, bootDashProgress, bootFrame, isCompeteDataReady, shouldShowBootSplash } from "./index";

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
  it("stays put through ready, then travels during the zoom window", () => {
    expect(BOOT_DURATION_MS).toBe(780);
    expect(bootFrame(0).travel).toBe(0);
    expect(bootFrame(0.2).travel).toBe(0);
    expect(bootFrame(0.34).travel).toBe(0);
    expect(bootFrame(0.46).travel).toBeGreaterThan(0.3);
    expect(bootFrame(0.58).travel).toBe(1);
    expect(bootFrame(1).travel).toBe(1);
    expect(bootFrame(1).phase).toBe("OVERTAEK");
  });

  it("maps ready to dash windup and the zoom to the dash burst", () => {
    expect(bootDashProgress(0)).toBe(0);
    expect(bootDashProgress(0.34)).toBeCloseTo(0.24);
    expect(bootDashProgress(0.58)).toBeCloseTo(0.76);
    expect(bootDashProgress(1)).toBe(1);
  });
});
