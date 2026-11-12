import { describe, expect, it } from "vitest";
import { parseVbodyBuffer } from "./load-vbody";

function packParticle(
  view: DataView,
  offset: number,
  px: number,
  py: number,
  pz: number,
  region: number,
  klass: number,
) {
  view.setFloat32(offset, px, true);
  view.setFloat32(offset + 4, py, true);
  view.setFloat32(offset + 8, pz, true);
  view.setFloat32(offset + 12, 0, true);
  view.setFloat32(offset + 16, 1, true);
  view.setFloat32(offset + 20, 0, true);
  view.setUint8(offset + 24, region);
  view.setUint8(offset + 25, klass);
}

describe("parseVbodyBuffer", () => {
  it("parses a minimal VBD1 payload", () => {
    const stride = 28;
    const count = 2;
    const buf = new ArrayBuffer(16 + count * stride);
    const view = new DataView(buf);
    view.setUint32(0, 0x31444256, true);
    view.setUint32(4, 1, true);
    view.setUint32(8, count, true);
    view.setUint32(12, stride, true);
    packParticle(view, 16, 0, 1.0, 0, 1, 1);
    packParticle(view, 16 + stride, 0.1, 1.2, -0.2, 2, 2);

    const asset = parseVbodyBuffer(buf);
    expect(asset.count).toBe(2);
    expect(asset.positions[4]).toBeCloseTo(1.2);
    expect(asset.regions[0]).toBe(1);
    expect(asset.classes[1]).toBe(2);
  });

  it("rejects truncated payloads", () => {
    const buf = new ArrayBuffer(20);
    const view = new DataView(buf);
    view.setUint32(0, 0x31444256, true);
    view.setUint32(4, 1, true);
    view.setUint32(8, 100, true);
    view.setUint32(12, 28, true);
    expect(() => parseVbodyBuffer(buf)).toThrow(/Truncated/);
  });
});
