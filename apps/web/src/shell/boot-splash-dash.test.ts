import { describe, expect, it } from "vitest";
import { EMBER_CLIPS, sampleEmber } from "@fitness-battle/shared/mascot";
import { BOOT_DURATION_MS, bootDashProgress, bootFrame } from "./boot-splash-motion";

describe("boot splash dash sync", () => {
  it("stays put through ready, then travels during the zoom window", () => {
    expect(BOOT_DURATION_MS).toBeLessThan(1500);
    expect(bootFrame(0.2).travel).toBe(0);
    expect(bootFrame(0.2).phase).toBe("Ready");
    expect(bootFrame(0.5).travel).toBeGreaterThan(0.2);
    expect(bootFrame(0.5).phase).toBe("Zoom");
    expect(bootFrame(0.85).travel).toBe(1);
    expect(bootFrame(1).phase).toBe("OVERTAEK");
  });

  it("maps ready to dash windup and the zoom to the dash burst", () => {
    const ready = sampleEmber("dash", bootDashProgress(0.2) * EMBER_CLIPS.dash.duration);
    const mid = sampleEmber("dash", bootDashProgress(0.55) * EMBER_CLIPS.dash.duration);
    const end = sampleEmber("dash", bootDashProgress(1) * EMBER_CLIPS.dash.duration);
    expect(Math.abs(ready.x)).toBeGreaterThan(0);
    expect(mid.trail).toBeGreaterThan(0.5);
    expect(end.trail).toBe(0);
    expect(end.x).toBe(0);
  });
});
