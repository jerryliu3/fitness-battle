import { describe, expect, it } from "vitest";
import { EMBER_CLIPS, sampleEmber } from "@fitness-battle/shared/mascot";
import { DURATION_MS, frameAt } from "@/features/overtaek/motion";

describe("boot splash dash sync", () => {
  it("keeps overtake travel and dash body on the same 0→1 progress", () => {
    expect(DURATION_MS).toBeGreaterThan(EMBER_CLIPS.dash.duration);
    const mid = frameAt(0.5);
    const dash = sampleEmber("dash", 0.5 * EMBER_CLIPS.dash.duration);
    expect(mid.distance).toBeGreaterThan(0.4);
    expect(mid.eShift).toBeGreaterThan(0.3);
    // Peak dash leans and trails while Ember is mid-pass.
    expect(dash.trail).toBeGreaterThan(0.5);
    expect(Math.abs(dash.rotation)).toBeGreaterThan(10);
  });

  it("starts and ends the dash sample at rest so the settled mark is calm", () => {
    const start = sampleEmber("dash", 0);
    const end = sampleEmber("dash", EMBER_CLIPS.dash.duration);
    expect(start.trail).toBe(0);
    expect(end.trail).toBe(0);
    expect(start.x).toBe(0);
    expect(end.x).toBe(0);
  });
});
