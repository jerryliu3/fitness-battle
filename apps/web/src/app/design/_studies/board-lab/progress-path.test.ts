import { describe, expect, it } from "vitest";
import { progressSamples, wakeBypass } from "./progress-path";

describe("earned path coordinates", () => {
  it("keeps breadcrumb identities while panning and bounds overview detail", () => {
    expect(progressSamples(16.2, 22.2, .2)).toContain(20);
    expect(progressSamples(17.2, 23.2, .2)).toContain(20);
    expect(progressSamples(0, 5000, .2).length).toBeLessThanOrEqual(151);
    expect(progressSamples(0, .39, .2)).toEqual([0, .2]);
  });
  it("moves onto the shoulder before entering the wake, and reaches the true endpoint", () => {
    const total = 19.2, clearance = 1.6, shoulder = -38;
    expect(wakeBypass(total, total, clearance, shoulder)).toBe(shoulder);
    expect(wakeBypass(total - clearance, total, clearance, shoulder)).toBeCloseTo(shoulder);
    expect(wakeBypass(total - clearance * 2, total, clearance, shoulder)).toBeCloseTo(0);
    expect(wakeBypass(total - clearance * 1.5, total, clearance, shoulder)).toBeCloseTo(shoulder / 2);
  });
});
