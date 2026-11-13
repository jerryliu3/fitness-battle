"use client";

import type {
  VitalsLabAnchor3D,
  VitalsLabMetricId,
  VitalsLabSystemId,
} from "@fitness-battle/shared";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export type VitalsLabGender = "female" | "male";
export type VitalsLabViewMode = "lumen" | "outline";

export interface VitalsLabProjectedPoint {
  x: number;
  y: number;
  visible: boolean;
}

export interface VitalsLabThreeViewportProps {
  appearance: "dark" | "light";
  gender: VitalsLabGender;
  viewMode: VitalsLabViewMode;
  activeMetric: VitalsLabMetricId | null;
  activeSystem: VitalsLabSystemId;
  zoom: number;
  panY: number;
  targetRotY: number;
  rotYStepNonce?: number;
  autoOrbit: boolean;
  scanNonce: number;
  anchor3D: VitalsLabAnchor3D | null;
  assetBaseUrl?: string;
  onScanComplete?: () => void;
  onDragStart?: () => void;
  onRotYChange?: (rotY: number) => void;
  onProjectAnchor?: (pt: VitalsLabProjectedPoint | null) => void;
}

const ANNY_SCALE = 1.694 / 1.74;
const ANNY_Y_OFFSET = -0.858;
const POINT_COUNT = 10500;
const CYL_RADIUS_X = 0.325;
const CYL_RADIUS_Z = 0.255;
const PLINTH_Y = -0.865;
const CROWN_Y = 0.895;

interface ParsedMorphMesh {
  positionsM: Float32Array;
  positionsF: Float32Array;
  normalsM: Float32Array;
  normalsF: Float32Array;
  indices: Uint32Array;
}

const cachedMeshPromise = new Map<string, Promise<ParsedMorphMesh>>();

function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss3(
  dx: number,
  dy: number,
  dz: number,
  rx: number,
  ry: number,
  rz: number,
): number {
  const nx = dx / rx;
  const ny = dy / ry;
  const nz = dz / rz;
  return Math.exp(-(nx * nx + ny * ny + nz * nz));
}

function computeRegionWeights(x: number, y: number, z: number) {
  const wHeart = gauss3(x - 0.036, y - 0.35, z - 0.025, 0.092, 0.108, 0.088);
  const wLungL = gauss3(x + 0.072, y - 0.36, z - 0.01, 0.082, 0.128, 0.088);
  const wLungR = gauss3(x - 0.072, y - 0.36, z - 0.01, 0.082, 0.128, 0.088);
  const wBreathing = Math.min(1, wLungL + wLungR);
  const wCranial = gauss3(Math.abs(x), y - 0.74, z - 0.015, 0.085, 0.11, 0.092);
  const wVagus = gauss3(Math.abs(x), y - 0.52, z - 0.01, 0.058, 0.18, 0.068);
  const wSleep = wCranial;
  const wHrv = Math.min(1, wCranial * 0.75 + wVagus * 0.85 + wHeart * 0.65);

  const wThighs = gauss3(
    Math.abs(x) - 0.095,
    y + 0.24,
    z,
    0.075,
    0.22,
    0.088,
  );
  const wCalves =
    gauss3(Math.abs(x) - 0.085, y + 0.56, z, 0.06, 0.16, 0.075) * 0.9;
  const wShoulders =
    gauss3(Math.abs(x) - 0.175, y - 0.41, z, 0.075, 0.14, 0.075) * 0.65;
  const wMovement = Math.min(1, wThighs + wCalves + wShoulders);

  return { wHeart, wHrv, wBreathing, wSleep, wMovement };
}

function classifyExtremity(x: number, y: number, z: number) {
  const isDigit =
    (Math.abs(x) > 0.202 && y > -0.2 && y < 0.06) ||
    y < -0.795 ||
    (y < -0.76 && z > 0.075);
  const isPalmOrFoot =
    !isDigit &&
    ((Math.abs(x) > 0.165 && y > -0.22 && y < 0.09) || y < -0.745);
  return {
    fresnelScale: isDigit ? 0.24 : isPalmOrFoot ? 0.65 : 1.0,
    baseLum: isDigit ? 0.46 : isPalmOrFoot ? 0.36 : 0.26,
    maxInteriorDepth: isDigit ? 0.0065 : isPalmOrFoot ? 0.015 : 0.054,
  };
}

function findFirstMesh(root: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  root.traverse((obj) => {
    if (!found && (obj as THREE.Mesh).isMesh) {
      found = obj as THREE.Mesh;
    }
  });
  return found;
}

function loadMorphMeshes(baseUrl: string): Promise<ParsedMorphMesh> {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const existing = cachedMeshPromise.get(cleanBase);
  if (existing) return existing;

  const promise = (async () => {
    const loader = new GLTFLoader();
    const [maleGltf, femaleGltf] = await Promise.all([
      loader.loadAsync(`${cleanBase}/bodies/anny/meshes/male.glb`),
      loader.loadAsync(`${cleanBase}/bodies/anny/meshes/female.glb`),
    ]);

    const maleMesh = findFirstMesh(maleGltf.scene);
    const femaleMesh = findFirstMesh(femaleGltf.scene);
    if (!maleMesh || !femaleMesh) {
      throw new Error("Missing mesh inside Anny GLB asset.");
    }

    const geomM = maleMesh.geometry;
    const geomF = femaleMesh.geometry;
    if (!geomM.getAttribute("normal")) geomM.computeVertexNormals();
    if (!geomF.getAttribute("normal")) geomF.computeVertexNormals();

    const posM = geomM.getAttribute("position");
    const posF = geomF.getAttribute("position");
    const normM = geomM.getAttribute("normal");
    const normF = geomF.getAttribute("normal");
    const idxM = geomM.getIndex();
    const idxF = geomF.getIndex();

    if (!idxM || !idxF || posM.count !== posF.count || idxM.count !== idxF.count) {
      throw new Error("Male and female Anny meshes do not match in topology.");
    }

    const vCount = posM.count;
    const parent = new Int32Array(vCount);
    for (let i = 0; i < vCount; i++) parent[i] = i;

    const find = (x: number): number => {
      let cur = x;
      while (parent[cur] !== cur) {
        parent[cur] = parent[parent[cur]];
        cur = parent[cur];
      }
      return cur;
    };
    const union = (a: number, b: number) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) {
        if (ra < rb) parent[rb] = ra;
        else parent[ra] = rb;
      }
    };

    const rawIndices = idxM.array;
    for (let i = 0; i < rawIndices.length; i += 3) {
      union(rawIndices[i], rawIndices[i + 1]);
      union(rawIndices[i + 1], rawIndices[i + 2]);
    }

    const counts = new Map<number, number>();
    let mainRoot = 0;
    let bestCount = 0;
    for (let i = 0; i < vCount; i++) {
      const r = find(i);
      const c = (counts.get(r) ?? 0) + 1;
      counts.set(r, c);
      if (c > bestCount) {
        bestCount = c;
        mainRoot = r;
      }
    }

    const remap = new Int32Array(vCount).fill(-1);
    let compactVCount = 0;
    for (let i = 0; i < vCount; i++) {
      if (find(i) === mainRoot) {
        remap[i] = compactVCount++;
      }
    }

    const filteredTris: number[] = [];
    for (let i = 0; i < rawIndices.length; i += 3) {
      const a = remap[rawIndices[i]];
      const b = remap[rawIndices[i + 1]];
      const c = remap[rawIndices[i + 2]];
      if (a >= 0 && b >= 0 && c >= 0) {
        filteredTris.push(a, b, c);
      }
    }

    const positionsM = new Float32Array(compactVCount * 3);
    const positionsF = new Float32Array(compactVCount * 3);
    const normalsM = new Float32Array(compactVCount * 3);
    const normalsF = new Float32Array(compactVCount * 3);

    for (let i = 0; i < vCount; i++) {
      const dst = remap[i];
      if (dst < 0) continue;
      const o = dst * 3;
      positionsM[o] = posM.getX(i) * ANNY_SCALE;
      positionsM[o + 1] = posM.getY(i) * ANNY_SCALE + ANNY_Y_OFFSET;
      positionsM[o + 2] = posM.getZ(i) * ANNY_SCALE;

      positionsF[o] = posF.getX(i) * ANNY_SCALE;
      positionsF[o + 1] = posF.getY(i) * ANNY_SCALE + ANNY_Y_OFFSET;
      positionsF[o + 2] = posF.getZ(i) * ANNY_SCALE;

      normalsM[o] = normM.getX(i);
      normalsM[o + 1] = normM.getY(i);
      normalsM[o + 2] = normM.getZ(i);

      normalsF[o] = normF.getX(i);
      normalsF[o + 1] = normF.getY(i);
      normalsF[o + 2] = normF.getZ(i);
    }

    return {
      positionsM,
      positionsF,
      normalsM,
      normalsF,
      indices: new Uint32Array(filteredTris),
    };
  })().catch((err) => {
    cachedMeshPromise.delete(cleanBase);
    throw err;
  });

  cachedMeshPromise.set(cleanBase, promise);
  return promise;
}

function buildOutlineGeometry(mesh: ParsedMorphMesh): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();
  const vCount = mesh.positionsM.length / 3;
  const w0 = new Float32Array(vCount * 4);
  const w1 = new Float32Array(vCount * 4);
  const fScale = new Float32Array(vCount);

  for (let i = 0; i < vCount; i++) {
    const o3 = i * 3;
    const x = mesh.positionsM[o3];
    const y = mesh.positionsM[o3 + 1];
    const z = mesh.positionsM[o3 + 2];
    const weights = computeRegionWeights(x, y, z);
    const o4 = i * 4;
    w0[o4] = weights.wHeart;
    w0[o4 + 1] = weights.wHrv;
    w0[o4 + 2] = weights.wBreathing;
    w0[o4 + 3] = weights.wSleep;
    w1[o4] = weights.wMovement;
    fScale[i] = classifyExtremity(x, y, z).fresnelScale;
  }

  geom.setAttribute("position", new THREE.BufferAttribute(mesh.positionsM, 3));
  geom.setAttribute("normal", new THREE.BufferAttribute(mesh.normalsM, 3));
  geom.setAttribute("aPosFemale", new THREE.BufferAttribute(mesh.positionsF, 3));
  geom.setAttribute("aNormFemale", new THREE.BufferAttribute(mesh.normalsF, 3));
  geom.setAttribute("aW0", new THREE.BufferAttribute(w0, 4));
  geom.setAttribute("aW1", new THREE.BufferAttribute(w1, 4));
  geom.setAttribute("aFresnelScale", new THREE.BufferAttribute(fScale, 1));
  geom.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  return geom;
}

function createMeshContainmentTester(
  positions: Float32Array,
  indices: Uint32Array,
): (px: number, py: number, pz: number) => boolean {
  const SLABS = 80;
  const MIN_Y = -0.9;
  const MAX_Y = 0.9;
  const invSpan = SLABS / (MAX_Y - MIN_Y);
  const slabs: number[][] = Array.from({ length: SLABS }, () => []);
  const triCount = indices.length / 3;

  for (let t = 0; t < triCount; t++) {
    const ia = indices[t * 3] * 3;
    const ib = indices[t * 3 + 1] * 3;
    const ic = indices[t * 3 + 2] * 3;
    const y0 = positions[ia + 1];
    const y1 = positions[ib + 1];
    const y2 = positions[ic + 1];
    const lo = Math.max(0, Math.floor((Math.min(y0, y1, y2) - MIN_Y) * invSpan));
    const hi = Math.min(
      SLABS - 1,
      Math.floor((Math.max(y0, y1, y2) - MIN_Y) * invSpan),
    );
    for (let s = lo; s <= hi; s++) slabs[s].push(t);
  }

  return (px: number, py: number, pz: number): boolean => {
    const sy = py + 1.37e-7;
    const sz = pz + 1.93e-7;
    const slabIdx = Math.floor((sy - MIN_Y) * invSpan);
    if (slabIdx < 0 || slabIdx >= SLABS) return false;
    const bucket = slabs[slabIdx];
    let hits = 0;

    for (let k = 0; k < bucket.length; k++) {
      const t = bucket[k];
      const ia = indices[t * 3] * 3;
      const ib = indices[t * 3 + 1] * 3;
      const ic = indices[t * 3 + 2] * 3;

      const ax = positions[ia];
      const bx = positions[ib];
      const cx = positions[ic];
      if (px > ax && px > bx && px > cx) continue;

      const ay = positions[ia + 1];
      const by = positions[ib + 1];
      const cy = positions[ic + 1];
      if (sy < Math.min(ay, by, cy) || sy > Math.max(ay, by, cy)) continue;

      const az = positions[ia + 2];
      const bz = positions[ib + 2];
      const cz = positions[ic + 2];
      if (sz < Math.min(az, bz, cz) || sz > Math.max(az, bz, cz)) continue;

      const e1y = by - ay;
      const e1z = bz - az;
      const e2y = cy - ay;
      const e2z = cz - az;
      const det = e1y * e2z - e2y * e1z;
      if (Math.abs(det) < 1e-12) continue;

      const dy = sy - ay;
      const dz = sz - az;
      const u = (dy * e2z - e2y * dz) / det;
      if (u < 0 || u > 1) continue;
      const v = (e1y * dz - dy * e1z) / det;
      if (v < 0 || u + v > 1) continue;

      const xHit = ax + u * (bx - ax) + v * (cx - ax);
      if (xHit > px) hits++;
    }

    return (hits & 1) === 1;
  };
}

function buildParticleGeometry(mesh: ParsedMorphMesh): THREE.BufferGeometry {
  const isInsideMale = createMeshContainmentTester(mesh.positionsM, mesh.indices);
  const isInsideFemale = createMeshContainmentTester(mesh.positionsF, mesh.indices);
  const triCount = mesh.indices.length / 3;
  const cdf = new Float64Array(triCount);
  let totalArea = 0;

  for (let t = 0; t < triCount; t++) {
    const ia = mesh.indices[t * 3] * 3;
    const ib = mesh.indices[t * 3 + 1] * 3;
    const ic = mesh.indices[t * 3 + 2] * 3;

    const abx = mesh.positionsM[ib] - mesh.positionsM[ia];
    const aby = mesh.positionsM[ib + 1] - mesh.positionsM[ia + 1];
    const abz = mesh.positionsM[ib + 2] - mesh.positionsM[ia + 2];
    const acx = mesh.positionsM[ic] - mesh.positionsM[ia];
    const acy = mesh.positionsM[ic + 1] - mesh.positionsM[ia + 1];
    const acz = mesh.positionsM[ic + 2] - mesh.positionsM[ia + 2];

    const cx = aby * acz - abz * acy;
    const cy = abz * acx - abx * acz;
    const cz = abx * acy - aby * acx;
    totalArea += 0.5 * Math.hypot(cx, cy, cz);
    cdf[t] = totalArea;
  }

  const posM = new Float32Array(POINT_COUNT * 3);
  const posF = new Float32Array(POINT_COUNT * 3);
  const normM = new Float32Array(POINT_COUNT * 3);
  const normF = new Float32Array(POINT_COUNT * 3);
  const aW0 = new Float32Array(POINT_COUNT * 4);
  const aW1 = new Float32Array(POINT_COUNT * 4);
  const aFresnelScale = new Float32Array(POINT_COUNT);
  const aBaseLum = new Float32Array(POINT_COUNT);
  const aSize = new Float32Array(POINT_COUNT);
  const aSurface = new Float32Array(POINT_COUNT);
  const aSeed = new Float32Array(POINT_COUNT);

  const rng = createRng(0x51a7b0d7);

  for (let i = 0; i < POINT_COUNT; i++) {
    const target = rng() * totalArea;
    let lo = 0;
    let hi = triCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < target) lo = mid + 1;
      else hi = mid;
    }

    const r1 = Math.sqrt(rng());
    const r2 = rng();
    const u = 1 - r1;
    const v = r1 * (1 - r2);
    const w = r1 * r2;

    const ia = mesh.indices[lo * 3] * 3;
    const ib = mesh.indices[lo * 3 + 1] * 3;
    const ic = mesh.indices[lo * 3 + 2] * 3;

    const mx = mesh.positionsM[ia] * u + mesh.positionsM[ib] * v + mesh.positionsM[ic] * w;
    const my = mesh.positionsM[ia + 1] * u + mesh.positionsM[ib + 1] * v + mesh.positionsM[ic + 1] * w;
    const mz = mesh.positionsM[ia + 2] * u + mesh.positionsM[ib + 2] * v + mesh.positionsM[ic + 2] * w;

    const fx = mesh.positionsF[ia] * u + mesh.positionsF[ib] * v + mesh.positionsF[ic] * w;
    const fy = mesh.positionsF[ia + 1] * u + mesh.positionsF[ib + 1] * v + mesh.positionsF[ic + 1] * w;
    const fz = mesh.positionsF[ia + 2] * u + mesh.positionsF[ib + 2] * v + mesh.positionsF[ic + 2] * w;

    let nmx = mesh.normalsM[ia] * u + mesh.normalsM[ib] * v + mesh.normalsM[ic] * w;
    let nmy = mesh.normalsM[ia + 1] * u + mesh.normalsM[ib + 1] * v + mesh.normalsM[ic + 1] * w;
    let nmz = mesh.normalsM[ia + 2] * u + mesh.normalsM[ib + 2] * v + mesh.normalsM[ic + 2] * w;
    const nml = Math.hypot(nmx, nmy, nmz) || 1;
    nmx /= nml;
    nmy /= nml;
    nmz /= nml;

    let nfx = mesh.normalsF[ia] * u + mesh.normalsF[ib] * v + mesh.normalsF[ic] * w;
    let nfy = mesh.normalsF[ia + 1] * u + mesh.normalsF[ib + 1] * v + mesh.normalsF[ic + 1] * w;
    let nfz = mesh.normalsF[ia + 2] * u + mesh.normalsF[ib + 2] * v + mesh.normalsF[ic + 2] * w;
    const nfl = Math.hypot(nfx, nfy, nfz) || 1;
    nfx /= nfl;
    nfy /= nfl;
    nfz /= nfl;

    const ext = classifyExtremity(mx, my, mz);
    const isSurface = rng() < 0.62;
    let depth = isSurface
      ? rng() * 0.004
      : 0.0055 + Math.pow(rng(), 0.72) * 0.044;
    depth = Math.min(depth, ext.maxInteriorDepth);

    // Clamp interior depth on concave surfaces (nostrils, eyelids, ears, etc.)
    // so -normal * depth never exits the watertight skin mesh.
    if (depth > 0.002) {
      const fits = (d: number) =>
        isInsideMale(mx - nmx * d, my - nmy * d, mz - nmz * d) &&
        isInsideFemale(fx - nfx * d, fy - nfy * d, fz - nfz * d);
      if (!fits(depth)) {
        const reduced = depth * 0.35;
        depth = fits(reduced) ? reduced : 0.0012;
      }
    }

    const o3 = i * 3;
    posM[o3] = mx - nmx * depth;
    posM[o3 + 1] = my - nmy * depth;
    posM[o3 + 2] = mz - nmz * depth;

    posF[o3] = fx - nfx * depth;
    posF[o3 + 1] = fy - nfy * depth;
    posF[o3 + 2] = fz - nfz * depth;

    normM[o3] = nmx;
    normM[o3 + 1] = nmy;
    normM[o3 + 2] = nmz;

    normF[o3] = nfx;
    normF[o3 + 1] = nfy;
    normF[o3 + 2] = nfz;

    const weights = computeRegionWeights(posM[o3], posM[o3 + 1], posM[o3 + 2]);
    const o4 = i * 4;
    aW0[o4] = weights.wHeart;
    aW0[o4 + 1] = weights.wHrv;
    aW0[o4 + 2] = weights.wBreathing;
    aW0[o4 + 3] = weights.wSleep;
    aW1[o4] = weights.wMovement;

    aFresnelScale[i] = ext.fresnelScale;
    aBaseLum[i] = ext.baseLum;
    aSurface[i] = isSurface ? 1.0 : 0.48;
    aSeed[i] = rng();
    aSize[i] = isSurface ? 0.9 + rng() * 0.45 : 0.72 + rng() * 0.4;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(posM, 3));
  geom.setAttribute("normal", new THREE.BufferAttribute(normM, 3));
  geom.setAttribute("aPosFemale", new THREE.BufferAttribute(posF, 3));
  geom.setAttribute("aNormFemale", new THREE.BufferAttribute(normF, 3));
  geom.setAttribute("aW0", new THREE.BufferAttribute(aW0, 4));
  geom.setAttribute("aW1", new THREE.BufferAttribute(aW1, 4));
  geom.setAttribute("aFresnelScale", new THREE.BufferAttribute(aFresnelScale, 1));
  geom.setAttribute("aBaseLum", new THREE.BufferAttribute(aBaseLum, 1));
  geom.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));
  geom.setAttribute("aSurface", new THREE.BufferAttribute(aSurface, 1));
  geom.setAttribute("aSeed", new THREE.BufferAttribute(aSeed, 1));
  return geom;
}

function createRadialGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0.0, "rgba(255,255,255,0.92)");
  grad.addColorStop(0.28, "rgba(255,255,255,0.52)");
  grad.addColorStop(0.62, "rgba(255,255,255,0.14)");
  grad.addColorStop(1.0, "rgba(255,255,255,0.0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createEllipseLoopGeometry(
  rx: number,
  rz: number,
  segments = 96,
  arcStart = 0,
  arcLength = Math.PI * 2,
): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const count = arcLength >= Math.PI * 1.999 ? segments : segments + 1;
  for (let i = 0; i < count; i++) {
    const t = arcStart + (i / segments) * arcLength;
    pts.push(new THREE.Vector3(Math.cos(t) * rx, 0, Math.sin(t) * rz));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

const REGION_SHADER_CHUNKS = /* glsl */ `
  float computeBreath() {
    return (sin(uTime * 1.48712) + 1.0) * 0.5;
  }

  float computeHeartPulse() {
    float c = fract(uTime / 1.1538);
    float lub = exp(-pow((c - 0.14) / 0.055, 2.0));
    float dub = 0.65 * exp(-pow((c - 0.30) / 0.065, 2.0));
    return clamp(lub + dub, 0.0, 1.0);
  }

  vec3 applyMorphAndBreath(vec3 posM, vec3 posF, float morph) {
    vec3 p = mix(posM, posF, morph);
    float breath = computeBreath();
    float chestY = smoothstep(0.18, 0.27, p.y) * (1.0 - smoothstep(0.41, 0.50, p.y));
    float torsoMask = 1.0 - smoothstep(0.135, 0.185, abs(p.x));
    float expand = chestY * torsoMask * breath * 0.017;
    p.x *= (1.0 + expand);
    p.z *= (1.0 + expand * 1.4);
    return p;
  }
`;

const PARTICLE_VERT = /* glsl */ `
  attribute vec3 aPosFemale;
  attribute vec3 aNormFemale;
  attribute vec4 aW0;
  attribute vec4 aW1;
  attribute float aFresnelScale;
  attribute float aBaseLum;
  attribute float aSize;
  attribute float aSurface;
  attribute float aSeed;

  uniform float uMorph;
  uniform float uOutlineMorph;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uScanY;
  uniform float uScanActive;
  uniform vec4 uTargetMask0;
  uniform float uTargetMask1;
  uniform float uIsLight;
  uniform vec3 uColorBase;
  uniform vec3 uColorGold;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vBoost;

  ${REGION_SHADER_CHUNKS}

  void main() {
    vec3 p = applyMorphAndBreath(position, aPosFemale, uMorph);
    vec3 n = normalize(mix(normal, aNormFemale, uMorph));
    vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPos;

    vec3 nView = normalize(normalMatrix * n);
    float fresnel = pow(1.0 - min(1.0, abs(nView.z)), 1.55) * aFresnelScale;

    float wActive = clamp(dot(aW0, uTargetMask0) + aW1.x * uTargetMask1, 0.0, 1.0);
    float hasFocus = clamp(dot(vec4(1.0), uTargetMask0) + uTargetMask1, 0.0, 1.0);

    float heartP = computeHeartPulse();
    float breathP = computeBreath();
    float shimmer = 0.5 + 0.5 * sin(uTime * 2.4 + aSeed * 6.2831);
    float zonePulse = mix(
      shimmer,
      heartP,
      clamp(uTargetMask0.x + uTargetMask0.y, 0.0, 1.0)
    );
    zonePulse = mix(zonePulse, breathP, uTargetMask0.z);

    float scanDist = abs(p.y - uScanY);
    float scanBand = uScanActive * exp(-(scanDist * scanDist) / 0.0022);

    float lumenFactor = max(0.05, 1.0 - uOutlineMorph * 0.88);
    float focusDim = mix(1.0, 0.34 + wActive * 0.96 + fresnel * 0.25, hasFocus);

    float baseGlow = (aBaseLum * aSurface + fresnel * 0.92);
    float goldMix = clamp(wActive * hasFocus * 1.15 + scanBand * 0.88, 0.0, 1.0);

    vec3 col = mix(uColorBase, uColorGold, goldMix);
    float pulseBoost = wActive * hasFocus * (0.35 + zonePulse * 0.45);
    float boost = pulseBoost + scanBand * 0.85;

    vColor = col;
    vBoost = boost;

    float alphaScale = uIsLight > 0.5 ? 0.78 : 0.86;
    vAlpha = clamp((baseGlow * focusDim + boost * 0.58) * lumenFactor * alphaScale, 0.0, 0.98);

    float pointScale = (uIsLight > 0.5 ? 3.55 : 3.25) * aSize * (1.0 + boost * 0.52);
    float depthScale = 2.45 / max(0.65, -mvPos.z);
    gl_PointSize = clamp(pointScale * depthScale * uPixelRatio, 1.2, 9.5);
  }
`;

const PARTICLE_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vBoost;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float radial = smoothstep(0.5, 0.08, d);
    gl_FragColor = vec4(vColor * (1.0 + vBoost * 0.28), vAlpha * radial);
  }
`;

const OUTLINE_VERT = /* glsl */ `
  attribute vec3 aPosFemale;
  attribute vec3 aNormFemale;
  attribute vec4 aW0;
  attribute vec4 aW1;
  attribute float aFresnelScale;

  uniform float uMorph;
  uniform float uTime;
  uniform vec4 uTargetMask0;
  uniform float uTargetMask1;

  varying vec3 vNormalView;
  varying vec3 vViewPos;
  varying float vActive;
  varying float vHasFocus;
  varying float vBodyY;
  varying float vFresnelScale;

  ${REGION_SHADER_CHUNKS}

  void main() {
    vec3 p = applyMorphAndBreath(position, aPosFemale, uMorph);
    vec3 n = normalize(mix(normal, aNormFemale, uMorph));
    vec4 mvPos = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPos;

    vNormalView = normalize(normalMatrix * n);
    vViewPos = -mvPos.xyz;
    vBodyY = p.y;
    vActive = clamp(dot(aW0, uTargetMask0) + aW1.x * uTargetMask1, 0.0, 1.0);
    vHasFocus = clamp(dot(vec4(1.0), uTargetMask0) + uTargetMask1, 0.0, 1.0);
    vFresnelScale = mix(0.42, 1.0, aFresnelScale);
  }
`;

const OUTLINE_FRAG = /* glsl */ `
  uniform float uOutlineMorph;
  uniform float uScanY;
  uniform float uScanActive;
  uniform float uIsLight;
  uniform vec3 uColorBase;
  uniform vec3 uColorGold;

  varying vec3 vNormalView;
  varying vec3 vViewPos;
  varying float vActive;
  varying float vHasFocus;
  varying float vBodyY;
  varying float vFresnelScale;

  void main() {
    vec3 n = normalize(vNormalView);
    vec3 v = normalize(vViewPos);
    float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);
    float fresnel = pow(1.0 - ndv, 2.2) * vFresnelScale;

    float outlineStrength = 0.09 + uOutlineMorph * 0.86;
    float focusDim = mix(1.0, 0.38 + vActive * 0.92, vHasFocus);
    float scanDist = abs(vBodyY - uScanY);
    float scanBand = uScanActive * exp(-(scanDist * scanDist) / 0.0025);

    float goldMix = clamp(vActive * vHasFocus * 1.05 + scanBand * 0.9, 0.0, 1.0);
    vec3 col = mix(uColorBase, uColorGold, goldMix);

    float membrane = uOutlineMorph * (uIsLight > 0.5 ? 0.05 : 0.08);
    float alpha = clamp((fresnel * outlineStrength * 1.12 + membrane + scanBand * 0.35) * focusDim, 0.0, 0.95);
    gl_FragColor = vec4(col, alpha);
  }
`;

const GLASS_VERT = /* glsl */ `
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPos;
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPos.xyz);
  }
`;

const GLASS_FRAG = /* glsl */ `
  uniform float uIsFront;
  uniform float uIsLight;
  uniform float uVisibility;

  varying vec3 vNormalView;
  varying vec3 vViewDir;
  varying vec2 vUv;

  void main() {
    float ndv = abs(dot(normalize(vNormalView), normalize(vViewDir)));
    float edgeRim = pow(1.0 - clamp(ndv, 0.0, 1.0), 3.1);
    float verticalFade = smoothstep(0.0, 0.06, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
    float streak = uIsFront > 0.5
      ? exp(-pow((vUv.x - 0.34) / 0.045, 2.0)) * 0.14 + exp(-pow((vUv.x - 0.67) / 0.03, 2.0)) * 0.08
      : 0.0;

    vec3 glassCol = uIsLight > 0.5
      ? vec3(0.055, 0.486, 0.525)
      : vec3(0.424, 0.898, 0.910);

    float baseAlpha = uIsFront > 0.5
      ? (edgeRim * (uIsLight > 0.5 ? 0.18 : 0.22) + streak)
      : (edgeRim * (uIsLight > 0.5 ? 0.12 : 0.14) + 0.015);

    gl_FragColor = vec4(glassCol, baseAlpha * verticalFade * uVisibility);
  }
`;

interface GlowSpec {
  id: string;
  target: "heart" | "hrv" | "breathing" | "sleep" | "movement";
  pos: [number, number, number];
  scale: number;
}

const GLOW_SPECS: GlowSpec[] = [
  { id: "rhr_heart", target: "heart", pos: [0.036, 0.35, 0.025], scale: 0.25 },
  { id: "hrv_head", target: "hrv", pos: [0, 0.74, 0.02], scale: 0.24 },
  { id: "hrv_vagus", target: "hrv", pos: [0, 0.52, 0.015], scale: 0.22 },
  { id: "hrv_heart", target: "hrv", pos: [0.036, 0.35, 0.025], scale: 0.22 },
  { id: "lung_l", target: "breathing", pos: [-0.072, 0.36, 0.015], scale: 0.28 },
  { id: "lung_r", target: "breathing", pos: [0.072, 0.36, 0.015], scale: 0.28 },
  { id: "sleep_head", target: "sleep", pos: [0, 0.74, 0.02], scale: 0.28 },
  { id: "move_thigh_l", target: "movement", pos: [-0.095, -0.24, 0.01], scale: 0.32 },
  { id: "move_thigh_r", target: "movement", pos: [0.095, -0.24, 0.01], scale: 0.32 },
  { id: "move_calf_l", target: "movement", pos: [-0.085, -0.56, 0.01], scale: 0.22 },
  { id: "move_calf_r", target: "movement", pos: [0.085, -0.56, 0.01], scale: 0.22 },
];

function getTargetVector(
  metric: VitalsLabMetricId | null,
  system: VitalsLabSystemId,
): [number, number, number, number, number] {
  if (metric === "rhr") return [1, 0, 0, 0, 0];
  if (metric === "hrv") return [0, 1, 0, 0, 0];
  if (metric === "resp" || metric === "spo2") return [0, 0, 1, 0, 0];
  if (metric === "sleep") return [0, 0, 0, 1, 0];
  if (metric === "active") return [0, 0, 0, 0, 1];
  if (system === "heart") return [1, 0, 0, 0, 0];
  if (system === "breathing") return [0, 0, 1, 0, 0];
  if (system === "movement") return [0, 0, 0, 0, 1];
  return [0, 0, 0, 0, 0];
}

export function VitalsLabThreeViewport({
  appearance,
  gender,
  viewMode,
  activeMetric,
  activeSystem,
  zoom,
  panY,
  targetRotY,
  rotYStepNonce = 0,
  autoOrbit,
  scanNonce,
  anchor3D,
  assetBaseUrl = "",
  onScanComplete,
  onDragStart,
  onRotYChange,
  onProjectAnchor,
}: VitalsLabThreeViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const stateRef = useRef({
    appearance,
    gender,
    viewMode,
    activeMetric,
    activeSystem,
    autoOrbit,
    anchor3D,
    onScanComplete,
    onDragStart,
    onRotYChange,
    onProjectAnchor,
  });
  stateRef.current = {
    appearance,
    gender,
    viewMode,
    activeMetric,
    activeSystem,
    autoOrbit,
    anchor3D,
    onScanComplete,
    onDragStart,
    onRotYChange,
    onProjectAnchor,
  };

  const cameraGoalRef = useRef({ zoom, panY, rotY: targetRotY });
  const prevPresetRef = useRef({ zoom, panY, targetRotY, rotYStepNonce });
  useEffect(() => {
    if (
      prevPresetRef.current.zoom !== zoom ||
      prevPresetRef.current.panY !== panY ||
      prevPresetRef.current.targetRotY !== targetRotY ||
      prevPresetRef.current.rotYStepNonce !== rotYStepNonce
    ) {
      cameraGoalRef.current = { zoom, panY, rotY: targetRotY };
      prevPresetRef.current = { zoom, panY, targetRotY, rotYStepNonce };
    }
  }, [zoom, panY, targetRotY, rotYStepNonce]);

  const prevAutoOrbitRef = useRef(autoOrbit);
  useEffect(() => {
    if (prevAutoOrbitRef.current && !autoOrbit) {
      stateRef.current.onRotYChange?.(cameraGoalRef.current.rotY);
    }
    prevAutoOrbitRef.current = autoOrbit;
  }, [autoOrbit]);

  const scanStateRef = useRef({
    lastNonce: scanNonce,
    active: false,
    progress: 0,
  });
  useEffect(() => {
    if (scanNonce !== scanStateRef.current.lastNonce) {
      scanStateRef.current.lastNonce = scanNonce;
      if (scanNonce > 0) {
        scanStateRef.current.active = true;
        scanStateRef.current.progress = 0;
      }
    }
  }, [scanNonce]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let rafId = 0;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "pan-y";
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 25);

    const chamberGroup = new THREE.Group();
    const bodyGroup = new THREE.Group();
    scene.add(chamberGroup);
    chamberGroup.add(bodyGroup);

    const glassUniformsBack = {
      uIsFront: { value: 0 },
      uIsLight: { value: appearance === "light" ? 1 : 0 },
      uVisibility: { value: 1 },
    };
    const glassUniformsFront = {
      uIsFront: { value: 1 },
      uIsLight: { value: appearance === "light" ? 1 : 0 },
      uVisibility: { value: 1 },
    };

    const glassGeo = new THREE.CylinderGeometry(
      CYL_RADIUS_X,
      CYL_RADIUS_X,
      CROWN_Y - PLINTH_Y,
      64,
      1,
      true,
    );
    glassGeo.scale(1, 1, CYL_RADIUS_Z / CYL_RADIUS_X);
    glassGeo.translate(0, (CROWN_Y + PLINTH_Y) * 0.5, 0);

    const backGlassMat = new THREE.ShaderMaterial({
      uniforms: glassUniformsBack,
      vertexShader: GLASS_VERT,
      fragmentShader: GLASS_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
    });
    const backGlassMesh = new THREE.Mesh(glassGeo, backGlassMat);
    backGlassMesh.renderOrder = 0;
    chamberGroup.add(backGlassMesh);

    const frontGlassMat = new THREE.ShaderMaterial({
      uniforms: glassUniformsFront,
      vertexShader: GLASS_VERT,
      fragmentShader: GLASS_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    const frontGlassMesh = new THREE.Mesh(glassGeo, frontGlassMat);
    frontGlassMesh.renderOrder = 3;
    chamberGroup.add(frontGlassMesh);

    const topRingGeo = createEllipseLoopGeometry(CYL_RADIUS_X, CYL_RADIUS_Z);
    const botRingGeo = createEllipseLoopGeometry(CYL_RADIUS_X, CYL_RADIUS_Z);
    const frontArcGeo = createEllipseLoopGeometry(
      CYL_RADIUS_X,
      CYL_RADIUS_Z,
      64,
      0,
      Math.PI,
    );
    const emitterLoopGeo = createEllipseLoopGeometry(
      CYL_RADIUS_X * 0.72,
      CYL_RADIUS_Z * 0.72,
    );

    const ringBackMat = new THREE.LineBasicMaterial({
      color: 0x6ce5e8,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    const ringFrontMat = new THREE.LineBasicMaterial({
      color: 0x6ce5e8,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });
    const emitterMat = new THREE.LineBasicMaterial({
      color: 0xf3c952,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });

    const topRingBack = new THREE.LineLoop(topRingGeo, ringBackMat);
    topRingBack.position.y = CROWN_Y;
    topRingBack.renderOrder = 0;
    const botRingBack = new THREE.LineLoop(botRingGeo, ringBackMat);
    botRingBack.position.y = PLINTH_Y;
    botRingBack.renderOrder = 0;
    const emitterRing = new THREE.LineLoop(emitterLoopGeo, emitterMat);
    emitterRing.position.y = PLINTH_Y + 0.002;
    emitterRing.renderOrder = 0;

    const plinthDiscGeo = new THREE.CircleGeometry(CYL_RADIUS_X, 64);
    plinthDiscGeo.rotateX(-Math.PI / 2);
    plinthDiscGeo.scale(1, 1, CYL_RADIUS_Z / CYL_RADIUS_X);
    const plinthDiscMat = new THREE.MeshBasicMaterial({
      color: 0x6ce5e8,
      transparent: true,
      opacity: 0.045,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const plinthDisc = new THREE.Mesh(plinthDiscGeo, plinthDiscMat);
    plinthDisc.position.y = PLINTH_Y;
    plinthDisc.renderOrder = 0;

    const topArcFront = new THREE.Line(frontArcGeo, ringFrontMat);
    topArcFront.position.y = CROWN_Y;
    topArcFront.renderOrder = 3;
    const botArcFront = new THREE.Line(frontArcGeo, ringFrontMat);
    botArcFront.position.y = PLINTH_Y;
    botArcFront.renderOrder = 3;

    chamberGroup.add(
      topRingBack,
      botRingBack,
      emitterRing,
      plinthDisc,
      topArcFront,
      botArcFront,
    );

    // Laser scan sweep ring
    const scanRingGeo = createEllipseLoopGeometry(
      CYL_RADIUS_X * 0.985,
      CYL_RADIUS_Z * 0.985,
    );
    const scanRingMat = new THREE.LineBasicMaterial({
      color: 0xf3c952,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const scanRing = new THREE.LineLoop(scanRingGeo, scanRingMat);
    scanRing.renderOrder = 4;
    scanRing.visible = false;

    const scanDiscGeo = new THREE.CircleGeometry(CYL_RADIUS_X * 0.98, 64);
    scanDiscGeo.rotateX(-Math.PI / 2);
    scanDiscGeo.scale(1, 1, CYL_RADIUS_Z / CYL_RADIUS_X);
    const scanDiscMat = new THREE.MeshBasicMaterial({
      color: 0xf3c952,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const scanDisc = new THREE.Mesh(scanDiscGeo, scanDiscMat);
    scanDisc.renderOrder = 4;
    scanDisc.visible = false;
    chamberGroup.add(scanRing, scanDisc);

    // Volumetric glow sprites attached to bodyGroup
    const glowTex = createRadialGlowTexture();
    const glowSprites = GLOW_SPECS.map((spec) => {
      const mat = new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xf3c952,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
      sprite.scale.set(spec.scale, spec.scale, 1);
      sprite.renderOrder = 1;
      sprite.visible = false;
      bodyGroup.add(sprite);
      return { spec, sprite, mat };
    });

    const bodyUniforms = {
      uMorph: { value: gender === "female" ? 1 : 0 },
      uOutlineMorph: { value: viewMode === "outline" ? 1 : 0 },
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uScanY: { value: 1.5 },
      uScanActive: { value: 0 },
      uTargetMask0: { value: new THREE.Vector4(0, 0, 0, 0) },
      uTargetMask1: { value: 0 },
      uIsLight: { value: appearance === "light" ? 1 : 0 },
      uColorBase: { value: new THREE.Color("#6CE5E8") },
      uColorGold: { value: new THREE.Color("#F3C952") },
    };

    let particleGeom: THREE.BufferGeometry | null = null;
    let particleMat: THREE.ShaderMaterial | null = null;
    let outlineGeom: THREE.BufferGeometry | null = null;
    let outlineMat: THREE.ShaderMaterial | null = null;

    loadMorphMeshes(assetBaseUrl)
      .then((parsed) => {
        if (disposed) return;
        outlineGeom = buildOutlineGeometry(parsed);
        outlineMat = new THREE.ShaderMaterial({
          uniforms: bodyUniforms,
          vertexShader: OUTLINE_VERT,
          fragmentShader: OUTLINE_FRAG,
          transparent: true,
          depthWrite: false,
          side: THREE.FrontSide,
          blending:
            stateRef.current.appearance === "light"
              ? THREE.NormalBlending
              : THREE.AdditiveBlending,
        });
        const outlineMesh = new THREE.Mesh(outlineGeom, outlineMat);
        outlineMesh.renderOrder = 2;
        outlineMesh.frustumCulled = false;

        particleGeom = buildParticleGeometry(parsed);
        particleMat = new THREE.ShaderMaterial({
          uniforms: bodyUniforms,
          vertexShader: PARTICLE_VERT,
          fragmentShader: PARTICLE_FRAG,
          transparent: true,
          depthWrite: false,
          blending:
            stateRef.current.appearance === "light"
              ? THREE.NormalBlending
              : THREE.AdditiveBlending,
        });
        const points = new THREE.Points(particleGeom, particleMat);
        points.renderOrder = 2;
        points.frustumCulled = false;

        bodyGroup.add(outlineMesh);
        bodyGroup.add(points);
        setLoadState("ready");
      })
      .catch(() => {
        if (!disposed) setLoadState("error");
      });

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(rect.width, rect.height, false);
      bodyUniforms.uPixelRatio.value = dpr;
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);

    // Drag-to-rotate pointer handling
    const dragState = {
      active: false,
      pointerId: -1,
      lastX: 0,
    };

    const handlePointerDown = (e: PointerEvent) => {
      dragState.active = true;
      dragState.pointerId = e.pointerId;
      dragState.lastX = e.clientX;
      renderer.domElement.style.cursor = "grabbing";
      renderer.domElement.setPointerCapture(e.pointerId);
      stateRef.current.onDragStart?.();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragState.active || e.pointerId !== dragState.pointerId) return;
      const dx = e.clientX - dragState.lastX;
      dragState.lastX = e.clientX;
      cameraGoalRef.current.rotY += dx * 0.011;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerId !== dragState.pointerId) return;
      dragState.active = false;
      renderer.domElement.style.cursor = "grab";
      if (renderer.domElement.hasPointerCapture(e.pointerId)) {
        renderer.domElement.releasePointerCapture(e.pointerId);
      }
      stateRef.current.onRotYChange?.(cameraGoalRef.current.rotY);
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerUp);

    let lastTime = performance.now();
    let currentZoom = cameraGoalRef.current.zoom;
    let currentPanY = cameraGoalRef.current.panY;
    let currentRotY = cameraGoalRef.current.rotY;
    let currentMorph = gender === "female" ? 1 : 0;
    let currentOutline = viewMode === "outline" ? 1 : 0;
    const currentMask = [0, 0, 0, 0, 0];
    const tmpVec = new THREE.Vector3();

    const animate = (now: number) => {
      if (disposed) return;
      rafId = requestAnimationFrame(animate);

      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const elapsed = now * 0.001;
      const s = stateRef.current;
      const isLight = s.appearance === "light";

      // Auto-orbit when idle
      if (s.autoOrbit && !dragState.active) {
        cameraGoalRef.current.rotY += dt * 0.28;
      }

      const damp = 1 - Math.exp(-dt * 8.2);
      currentZoom += (cameraGoalRef.current.zoom - currentZoom) * damp;
      currentPanY += (cameraGoalRef.current.panY - currentPanY) * damp;
      currentRotY += (cameraGoalRef.current.rotY - currentRotY) * damp;

      const targetMorph = s.gender === "female" ? 1 : 0;
      const targetOutline = s.viewMode === "outline" ? 1 : 0;
      currentMorph += (targetMorph - currentMorph) * damp;
      currentOutline += (targetOutline - currentOutline) * damp;

      const targetVec = getTargetVector(s.activeMetric, s.activeSystem);
      for (let i = 0; i < 5; i++) {
        currentMask[i] += (targetVec[i] - currentMask[i]) * damp;
      }

      // Scan progression
      let scanY = 1.5;
      let scanActive = 0;
      if (scanStateRef.current.active) {
        scanStateRef.current.progress += dt / 2.2;
        if (scanStateRef.current.progress >= 1) {
          scanStateRef.current.active = false;
          scanStateRef.current.progress = 0;
          s.onScanComplete?.();
        } else {
          const p = scanStateRef.current.progress;
          scanY = 0.96 - p * (0.96 + 0.98);
          scanActive =
            Math.min(1, p * 8) * Math.min(1, (1 - p) * 8);
        }
      }

      scanRing.visible = scanActive > 0.01;
      scanDisc.visible = scanActive > 0.01;
      if (scanRing.visible) {
        scanRing.position.y = scanY;
        scanDisc.position.y = scanY;
        scanRingMat.color.set(isLight ? "#D99B16" : "#F3C952");
        scanDiscMat.color.set(isLight ? "#D99B16" : "#F3C952");
        scanRingMat.opacity = scanActive * 0.92;
        scanDiscMat.opacity = scanActive * (isLight ? 0.09 : 0.14);
      }

      // Sync appearance colors & blendings
      bodyUniforms.uMorph.value = currentMorph;
      bodyUniforms.uOutlineMorph.value = currentOutline;
      bodyUniforms.uTime.value = elapsed;
      bodyUniforms.uScanY.value = scanY;
      bodyUniforms.uScanActive.value = scanActive;
      bodyUniforms.uTargetMask0.value.set(
        currentMask[0],
        currentMask[1],
        currentMask[2],
        currentMask[3],
      );
      bodyUniforms.uTargetMask1.value = currentMask[4];
      bodyUniforms.uIsLight.value = isLight ? 1 : 0;
      bodyUniforms.uColorBase.value.set(isLight ? "#0E7C86" : "#6CE5E8");
      bodyUniforms.uColorGold.value.set(isLight ? "#D99B16" : "#F3C952");

      const targetBlend = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
      if (particleMat && particleMat.blending !== targetBlend) {
        particleMat.blending = targetBlend;
        particleMat.needsUpdate = true;
      }
      if (outlineMat && outlineMat.blending !== targetBlend) {
        outlineMat.blending = targetBlend;
        outlineMat.needsUpdate = true;
      }

      // Chamber visibility & colors
      const ringVisibility = Math.max(0.18, 1 - (currentZoom - 1) * 0.85);
      glassUniformsBack.uIsLight.value = isLight ? 1 : 0;
      glassUniformsFront.uIsLight.value = isLight ? 1 : 0;
      glassUniformsBack.uVisibility.value = ringVisibility;
      glassUniformsFront.uVisibility.value = ringVisibility;

      ringBackMat.color.set(isLight ? "#0E7C86" : "#6CE5E8");
      ringFrontMat.color.set(isLight ? "#0E7C86" : "#6CE5E8");
      plinthDiscMat.color.set(isLight ? "#0E7C86" : "#6CE5E8");
      emitterMat.color.set(isLight ? "#D99B16" : "#F3C952");

      ringBackMat.opacity = (isLight ? 0.28 : 0.34) * ringVisibility;
      ringFrontMat.opacity = (isLight ? 0.38 : 0.46) * ringVisibility;
      plinthDiscMat.opacity = (isLight ? 0.055 : 0.065) * ringVisibility;
      emitterMat.opacity =
        (isLight ? 0.28 : 0.38) * ringVisibility + scanActive * 0.38;

      // Update volumetric glow sprites
      const c = (elapsed / 1.1538) % 1;
      const lub = Math.exp(-Math.pow((c - 0.14) / 0.055, 2));
      const dub = 0.65 * Math.exp(-Math.pow((c - 0.3) / 0.065, 2));
      const heartPulse = Math.min(1, lub + dub);
      const breathPulse = (Math.sin(elapsed * 1.48712) + 1) * 0.5;

      for (const item of glowSprites) {
        const idx =
          item.spec.target === "heart"
            ? 0
            : item.spec.target === "hrv"
              ? 1
              : item.spec.target === "breathing"
                ? 2
                : item.spec.target === "sleep"
                  ? 3
                  : 4;
        const m = currentMask[idx];
        item.sprite.visible = m > 0.02;
        if (!item.sprite.visible) continue;

        if (item.mat.blending !== targetBlend) {
          item.mat.blending = targetBlend;
          item.mat.needsUpdate = true;
        }
        const pulse =
          idx <= 1
            ? heartPulse
            : idx === 2
              ? breathPulse
              : 0.45 + 0.55 * (Math.sin(elapsed * 2.1) * 0.5 + 0.5);

        item.mat.color.set(isLight ? "#D99B16" : "#F3C952");
        item.mat.opacity =
          m * (isLight ? 0.28 : 0.42) * (0.65 + pulse * 0.55);
        const sVal = item.spec.scale * (0.94 + pulse * 0.16);
        item.sprite.scale.set(sVal, sVal, 1);
      }

      // Position camera & rotate body inside scanner chamber
      bodyGroup.rotation.y = currentRotY;
      camera.position.set(0, currentPanY * 0.85 - 0.01, 3.72 / currentZoom);
      camera.lookAt(0, currentPanY - 0.055, 0);

      scene.updateMatrixWorld(true);
      renderer.render(scene, camera);

      // Project anatomical 3D anchor -> viewport pixels for HUD tether
      if (s.onProjectAnchor) {
        if (!s.anchor3D) {
          s.onProjectAnchor(null);
        } else {
          tmpVec.set(s.anchor3D.x, s.anchor3D.y, s.anchor3D.z);
          bodyGroup.localToWorld(tmpVec);
          tmpVec.project(camera);
          const w = container.clientWidth;
          const h = container.clientHeight;
          const visible = tmpVec.z >= -1 && tmpVec.z <= 1;
          s.onProjectAnchor({
            x: (tmpVec.x * 0.5 + 0.5) * w,
            y: (-tmpVec.y * 0.5 + 0.5) * h,
            visible,
          });
        }
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
      glassGeo.dispose();
      backGlassMat.dispose();
      frontGlassMat.dispose();
      topRingGeo.dispose();
      botRingGeo.dispose();
      frontArcGeo.dispose();
      emitterLoopGeo.dispose();
      plinthDiscGeo.dispose();
      plinthDiscMat.dispose();
      ringBackMat.dispose();
      ringFrontMat.dispose();
      emitterMat.dispose();
      scanRingGeo.dispose();
      scanRingMat.dispose();
      scanDiscGeo.dispose();
      scanDiscMat.dispose();
      glowTex.dispose();
      for (const g of glowSprites) g.mat.dispose();
      particleGeom?.dispose();
      particleMat?.dispose();
      outlineGeom?.dispose();
      outlineMat?.dispose();
      renderer.dispose();
    };
  }, [assetBaseUrl]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        cursor: "grab",
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
      {loadState === "error" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontSize: 11,
            letterSpacing: "0.06em",
            color:
              appearance === "light"
                ? "rgba(15, 29, 36, 0.55)"
                : "rgba(255, 255, 255, 0.55)",
          }}
        >
          Unable to load body model
        </div>
      )}
    </div>
  );
}
