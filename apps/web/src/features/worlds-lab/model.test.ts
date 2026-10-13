import { describe, expect, it } from "vitest";
import { distanceFor, you } from "../evolution-lab/model";
import {
  comparisonScale,
  imports,
  orbitArc,
  orbitPoint,
  references,
  referenceSegment,
  snapshot,
} from "./model";

describe("product world distance presentations", () => {
  it("uses the same zero origin and cutoff for both sides of every comparison", () => {
    for (const reference of references)
      expect(snapshot(0, reference)).toMatchObject({
        total: 0,
        against: 0,
        gap: 0,
        count: 0,
      });
    expect(snapshot(2, references[1])).toMatchObject({
      total: 13,
      against: 12.4,
      gap: 0.6,
    });
    expect(snapshot(3, references[1])).toMatchObject({
      total: 19.2,
      against: 20.1,
      gap: -0.9,
    });
    expect(snapshot(3)).toMatchObject({ against: 16, gap: 3.2 });
  });
  it("reconciles individual comic frames and mixtape tracks to the cumulative total", () => {
    expect(imports.reduce((sum, a) => sum + a.km, 0)).toBeCloseTo(
      distanceFor(you, 3),
    );
    for (const reference of references) {
      for (let cutoff = 1; cutoff <= 3; cutoff++) {
        const sum = Array.from({ length: cutoff }, (_, index) =>
          referenceSegment(reference, index),
        ).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(distanceFor(reference, cutoff));
      }
    }
  });
  it("keeps the circular and broadcast scale consistent across all replay checkpoints", () => {
    for (const reference of references) {
      const scale = comparisonScale(reference);
      for (let cutoff = 0; cutoff <= 3; cutoff++) {
        expect(snapshot(cutoff, reference).total).toBeLessThanOrEqual(scale);
        expect(snapshot(cutoff, reference).against).toBeLessThanOrEqual(scale);
      }
      expect(orbitPoint(0, scale, 100)).toEqual({ x: 200, y: 100 });
      expect(orbitPoint(scale / 4, scale, 100).x).toBeCloseTo(300);
      expect(orbitPoint(scale / 4, scale, 100).y).toBeCloseTo(200);
      expect(orbitPoint(scale, scale, 100).y).toBeCloseTo(100);
    }
    expect(orbitArc(0, 20, 20, 100).match(/A /g)).toHaveLength(2);
  });
});
