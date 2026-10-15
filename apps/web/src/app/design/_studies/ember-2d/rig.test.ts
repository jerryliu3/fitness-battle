import { describe, expect, it } from "vitest";
import { deformPoint, flightPoseAt, FRONT, poseLibrary, rigAt } from "./rig";

describe("reference Ember rig", () => {
  it("keeps the four ordinary front points balanced", () => {
    const points = [...rigAt(FRONT).path.matchAll(/(-?\d+\.\d+) (-?\d+\.\d+)/g)]
      .map(match => [Number(match[1]), Number(match[2])]).filter(([, y]) => y >= 122);
    expect(points.length).toBeGreaterThan(20);
    for (const [x, y] of points) {
      expect(points.some(([otherX, otherY]) => otherX === 320 - x && otherY === y)).toBe(true);
    }
  });

  it("sweeps each point independently and keeps the torso fixed", () => {
    const flying = poseLibrary[2].pose;
    const moved = (x: number, y: number) => { const p = deformPoint(x, y, flying); return [p[0] - x, p[1] - y]; };
    expect(deformPoint(160, 180, flying)).toEqual([160, 180]);
    expect(moved(24, 143)[0]).toBeLessThan(0);
    expect(moved(296, 143)[1]).toBeLessThan(0);
    expect(moved(86, 334)).not.toEqual(moved(234, 334));
  });

  it("supports arbitrary scrubbing without drift or invalid geometry", () => {
    const neutral = rigAt(FRONT).path;
    for (let i = 0; i <= 500; i++) {
      const pose = rigAt(flightPoseAt(i / 500));
      expect(pose.path.startsWith("M ") && pose.path.endsWith(" Z")).toBe(true);
      expect(pose.path).not.toMatch(/NaN|Infinity/);
      for (const value of pose.path.match(/-?\d+(?:\.\d+)?/g) ?? []) {
        expect(Number(value)).toBeGreaterThan(-20);
        expect(Number(value)).toBeLessThan(380);
      }
    }
    expect(rigAt(flightPoseAt(1)).path).toBe(neutral);
    expect(rigAt(flightPoseAt(0)).path).toBe(neutral);
  });
});
