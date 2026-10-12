import { describe, expect, it } from "vitest";
import {
  distanceFor,
  gapFor,
  laneRunners,
  placeFor,
  trackWindow,
  trackY,
  worldZ,
  you,
} from "./model";

describe("forward track presentation", () => {
  it("starts every runner at zero, then advances absolute world positions", () => {
    laneRunners.forEach((r) => expect(distanceFor(r, 0)).toBe(0));
    expect(distanceFor(you, 1)).toBe(5.9);
    expect(distanceFor(you, 3)).toBe(19.2);
    expect(worldZ(distanceFor(you, 3))).toBeLessThan(
      worldZ(distanceFor(you, 1)),
    );
    expect(worldZ(0)).toBe(0);
  });
  it("keeps lanes stable while ranks and signed gaps change", () => {
    expect(laneRunners[4]!.id).toBe("you");
    expect(placeFor("you", 1)).toBe(5);
    expect(placeFor("you", 2)).toBe(3);
    expect(placeFor("you", 3)).toBe(4);
    expect(gapFor(laneRunners[2]!, 2)).toBe(-0.6);
    expect(gapFor(laneRunners[2]!, 3)).toBe(0.9);
  });
  it("uses proportional gaps and a scrolling window without a finish cap", () => {
    const w = trackWindow(19.2, 6, null),
      y = (km: number) => trackY(km, w.min, w.max, 560);
    expect((y(16.4) - y(19.2)) / (y(19.2) - y(20.1))).toBeCloseTo(2.8 / 0.9);
    expect(trackWindow(119.2, 6, null).max).toBeGreaterThan(120);
    expect(trackWindow(19.2, 6, 100).min).toBe(100);
    expect(distanceFor(you, 3, 20)).toBe(39.2);
    expect(you.km[2]).toBe(19.2);
  });
  it("shares ranks at a tie and excludes cosmetic changes from the model", () => {
    expect(placeFor("you", 3, 0.9)).toBe(3);
    expect(placeFor("maya", 3, 0.9)).toBe(3);
    expect(distanceFor(you, 0.5)).toBe(2.95);
    expect(distanceFor(you, -4)).toBe(0);
    expect(distanceFor(you, 10)).toBe(19.2);
  });
});
