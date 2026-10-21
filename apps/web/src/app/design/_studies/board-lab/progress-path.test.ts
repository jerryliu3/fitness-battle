import { describe, expect, it } from "vitest";
import { progressSamples, traceOpacity, traceSegments } from "./progress-path";

describe("earned path coordinates", () => {
  it("keeps breadcrumb identities while panning and bounds overview detail", () => {
    expect(progressSamples(16.2, 22.2, .2)).toContain(20);
    expect(progressSamples(17.2, 23.2, .2)).toContain(20);
    expect(progressSamples(0, 5000, .2).length).toBeLessThanOrEqual(151);
    expect(progressSamples(0, .39, .2)).toEqual([0, .2]);
  });
  it("keeps underlay uniform and blends continuously through the wake without a blank gap", () => {
    const total = 19.2, clearance = 1.6;
    expect(traceOpacity(0, total, clearance, "underlay")).toBe(traceOpacity(total, total, clearance, "underlay"));
    expect(traceOpacity(total, total, clearance, "blend")).toBeGreaterThan(0);
    expect(traceOpacity(total - clearance / 2, total, clearance, "blend")).toBeGreaterThan(traceOpacity(total, total, clearance, "blend"));
    expect(traceOpacity(total - clearance, total, clearance, "blend")).toBeCloseTo(.58);
  });
  it("covers the entire visible interval and bounds detail even for huge spans", () => {
    const pieces = traceSegments(16.2, 19.2, .1);
    expect(pieces[0]?.from).toBe(16.2); expect(pieces.at(-1)?.to).toBeCloseTo(19.2);
    expect(pieces.every((piece, i) => i === 0 || piece.from === pieces[i - 1]?.to)).toBe(true);
    expect(traceSegments(0, 5000, .02)).toHaveLength(120);
    expect(traceSegments(20, 19, .2)).toEqual([]);
  });
});
