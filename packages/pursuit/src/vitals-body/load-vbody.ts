import type { BodyMeshSource, QualityPreset, VitalsParticleAsset, VizMode } from "./types";

const MAGIC = 0x31444256; // 'VBD1' little-endian

export function vitalsAssetBase(source: BodyMeshSource): string {
  return `/bodies/${source}`;
}
const STRIDE = 28;

export function assetUrl(
  basePath: string,
  sex: string,
  mode: VizMode,
  quality: QualityPreset,
): string {
  const root = basePath.replace(/\/$/, "");
  return `${root}/pointclouds/${sex}/${mode}-${quality}.vbody`;
}

export function parseVbodyBuffer(buf: ArrayBuffer, source = "buffer"): VitalsParticleAsset {
  const view = new DataView(buf);
  const magic = view.getUint32(0, true);
  if (magic !== MAGIC) throw new Error(`Invalid vbody magic at ${source}`);
  const version = view.getUint32(4, true);
  if (version !== 1) throw new Error(`Unsupported vbody version ${version}`);
  const count = view.getUint32(8, true);
  const stride = view.getUint32(12, true);
  if (stride !== STRIDE) throw new Error(`Unexpected stride ${stride}`);

  const expected = 16 + count * stride;
  if (buf.byteLength < expected) {
    throw new Error(
      `Truncated vbody at ${source}: expected ${expected} bytes, got ${buf.byteLength}`,
    );
  }

  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const regions = new Uint8Array(count);
  const classes = new Uint8Array(count);

  let offset = 16;
  for (let i = 0; i < count; i++) {
    positions[i * 3] = view.getFloat32(offset, true);
    positions[i * 3 + 1] = view.getFloat32(offset + 4, true);
    positions[i * 3 + 2] = view.getFloat32(offset + 8, true);
    normals[i * 3] = view.getFloat32(offset + 12, true);
    normals[i * 3 + 1] = view.getFloat32(offset + 16, true);
    normals[i * 3 + 2] = view.getFloat32(offset + 20, true);
    regions[i] = view.getUint8(offset + 24);
    classes[i] = view.getUint8(offset + 25);
    offset += stride;
  }

  return { count, positions, normals, regions, classes };
}

export async function loadVbody(url: string): Promise<VitalsParticleAsset> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  const buf = await res.arrayBuffer();
  return parseVbodyBuffer(buf, url);
}
