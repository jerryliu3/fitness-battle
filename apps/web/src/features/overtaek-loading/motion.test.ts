import { describe, expect, it } from "vitest";
import { frameAt, motionAt } from "./motion";
import { decodeMesh } from "./renderer";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Overtaek overtaking choreography", () => {
  it("accelerates, passes at full speed, brakes, and stops without reversing the main travel", () => {
    let previous = 0;
    for (let i = 0; i <= 1000; i++) {
      const m = motionAt(i / 1000);
      expect(m.distance).toBeGreaterThanOrEqual(previous - 1e-10);
      expect(m.speed).toBeGreaterThanOrEqual(0);
      expect(m.speed).toBeLessThanOrEqual(1);
      previous = m.distance;
    }
    expect(motionAt(.36).acceleration).toBeGreaterThan(0);
    expect(motionAt(.49).speed).toBe(1);
    expect(motionAt(.62).acceleration).toBeLessThan(0);
    expect(motionAt(1)).toMatchObject({ speed: 0, distance: 1 });
  });
  it("starts with Ember before E and finishes with E before Ember", () => {
    expect(frameAt(0)).toMatchObject({ distance: 0, eShift: 0, tip: 0, limb: 0 });
    expect(frameAt(1)).toMatchObject({ distance: 1, eShift: 1, tip: 0, limb: 0, lift: expect.closeTo(0), phase: "OVERTAEK" });
  });
  it("has deterministic, bounded wind lag and a braking rebound", () => {
    const frames = Array.from({ length: 1001 }, (_, i) => frameAt(i / 1000));
    expect(Math.max(...frames.map(f => f.tip))).toBeGreaterThan(.45);
    expect(Math.min(...frames.map(f => f.tip))).toBeLessThan(-.05);
    for (const frame of frames) {
      expect(Number.isFinite(frame.tip)).toBe(true);
      expect(Math.abs(frame.tip)).toBeLessThan(.7);
      expect(Math.abs(frame.limb)).toBeLessThan(.2);
    }
    const before = frameAt(.49);
    frameAt(.9); frameAt(.1);
    expect(frameAt(.49)).toEqual(before);
  });
});

describe("Ember binary asset", () => {
  const bytes = readFileSync(resolve(process.cwd(), "public/brand/overtaek/ember-mesh.bin"));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  it("decodes the bundled mesh and keeps its indices inside the vertex buffer", () => {
    const mesh = decodeMesh(buffer);
    expect(mesh.vertices.byteLength + mesh.indices.byteLength).toBe(197280);
    expect(Math.max(...mesh.indices)).toBeLessThan(mesh.vertices.byteLength / 20);
  });
  it("rejects corrupt and truncated meshes before allocating graphics resources", () => {
    expect(() => decodeMesh(new ArrayBuffer(16))).toThrow();
    expect(() => decodeMesh(buffer.slice(0, -2))).toThrow();
  });
});
