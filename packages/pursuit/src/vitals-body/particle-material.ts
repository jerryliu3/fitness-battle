import * as THREE from "three";
import type { AppearanceMode, FaceStyle, HealthSystem, VizMode } from "./types";

const REGION_MAP: Record<HealthSystem, number> = {
  full: 0,
  cardiovascular: 1,
  respiratory: 2,
  movement: 3,
};

const FACE_MAP: Record<FaceStyle, number> = {
  mannequin: 0,
  soft: 1,
  natural: 2,
};

export function createParticleMaterial(
  appearance: AppearanceMode,
  reducedMotion: boolean,
): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uMode: { value: 0 },
      uHighlight: { value: 0 },
      uFace: { value: 1 },
      uOpacity: { value: 0.7 },
      uBrightness: { value: 0.9 },
      uGlow: { value: 0.65 },
      uEdge: { value: 0.75 },
      uSize: { value: 1.1 },
      uAnimate: { value: reducedMotion ? 0 : 1 },
      uTeal: { value: new THREE.Color() },
      uGold: { value: new THREE.Color() },
      uRimMix: { value: 0.35 },
      uScanY: { value: 2.0 },
      uScanStrength: { value: 0.0 },
    },
    vertexShader: /* glsl */ `
      attribute float aRegion;
      attribute float aClass;
      varying float vRegion;
      varying float vClass;
      varying float vRim;
      varying vec3 vLocalPos;
      uniform float uSize;
      uniform float uEdge;
      uniform float uMode;
      void main() {
        vLocalPos = position;
        vRegion = aRegion;
        vClass = aClass;
        if (uMode < 0.5 && aClass > 1.5) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          gl_PointSize = 0.0;
          return;
        }
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 nView = normalize(normalMatrix * normal);
        vec3 viewDir = normalize(-mv.xyz);
        vRim = pow(1.0 - max(0.0, dot(nView, viewDir)), 2.0) * uEdge;
        float classBoost = aClass < 1.5 ? 1.0 : 0.78;
        float cloudBoost = (uMode > 0.5 && aClass > 1.5) ? 1.08 : 1.0;
        float dist = max(0.55, -mv.z);
        gl_PointSize = uSize * classBoost * cloudBoost * (52.0 / dist);
        gl_PointSize = min(gl_PointSize, 10.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vRegion;
      varying float vClass;
      varying float vRim;
      varying vec3 vLocalPos;
      uniform float uTime;
      uniform float uMode;
      uniform float uHighlight;
      uniform float uFace;
      uniform float uOpacity;
      uniform float uBrightness;
      uniform float uGlow;
      uniform float uAnimate;
      uniform float uRimMix;
      uniform float uScanY;
      uniform float uScanStrength;
      uniform vec3 uTeal;
      uniform vec3 uGold;
      void main() {
        if (uMode < 0.5 && vClass > 1.5) discard;

        vec2 c = gl_PointCoord - 0.5;
        float r = length(c);
        if (r > 0.5) discard;
        float soft = smoothstep(0.5, 0.22, r);
        float pulse = uAnimate > 0.5
          ? 0.94 + 0.06 * sin(uTime * 1.2 + vRegion * 3.0)
          : 1.0;

        vec3 base = mix(uTeal, uGold, clamp(vRim * uRimMix, 0.0, 1.0));
        float interiorFade = (uMode > 0.5 && vClass > 1.5) ? 0.52 : 1.0;
        float regionMix = 0.0;
        if (uHighlight > 0.5) {
          regionMix = 1.0 - smoothstep(0.0, 1.05, abs(vRegion - uHighlight));
        }

        float headT = clamp((vLocalPos.y - 1.36) / 0.36, 0.0, 1.0);
        float faceMask = headT;
        if (headT > 0.01) {
          float front = smoothstep(-0.06, 0.12, -vLocalPos.z);
          float mid = smoothstep(0.17, 0.05, abs(vLocalPos.x));
          faceMask = headT * front * mid;
        }
        float faceDetail = faceMask * (0.55 + vRim * 0.85);

        vec3 col = base * uBrightness * pulse * interiorFade;
        col = mix(col, mix(col, uGold, 0.68) * 1.28, regionMix * 0.82);
        float alpha = soft * uOpacity * interiorFade;

        if (uFace < 0.5) {
          col = mix(col, uTeal, faceDetail * 0.45);
          alpha *= mix(1.0, 0.12, faceDetail);
        } else if (uFace < 1.5) {
          col = mix(col, uTeal, faceDetail * 0.18);
          alpha *= mix(1.0, 0.5, faceDetail * vRim);
        }

        col += vRim * uGold * uGlow * (0.22 + regionMix * 0.35);
        if (uScanStrength > 0.01) {
          float scanBand = 1.0 - smoothstep(0.05, 0.14, abs(vLocalPos.y - uScanY));
          col *= 1.0 + scanBand * uScanStrength * 0.95;
          alpha *= 1.0 + scanBand * uScanStrength * 0.4;
        }
        if (uMode < 0.5) {
          alpha = pow(alpha, 1.25);
        }
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  applyAppearanceMaterial(material, appearance);
  return material;
}

export function applyAppearanceMaterial(
  material: THREE.ShaderMaterial,
  appearance: AppearanceMode,
): void {
  const dark = appearance === "dark";
  material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
  material.depthWrite = !dark;

  const teal = dark ? "#6ce5e8" : "#0e7c86";
  const gold = dark ? "#f3c952" : "#d99b16";
  (material.uniforms.uTeal!.value as THREE.Color).set(teal);
  (material.uniforms.uGold!.value as THREE.Color).set(gold);
  material.uniforms.uRimMix!.value = dark ? 0.35 : 0.22;
}

export function setAppearance(
  material: THREE.ShaderMaterial,
  appearance: AppearanceMode,
  renderer: THREE.WebGLRenderer,
): void {
  applyAppearanceMaterial(material, appearance);
  renderer.toneMappingExposure = appearance === "dark" ? 1.05 : 0.95;
}

export function applyHighlight(
  material: THREE.ShaderMaterial,
  system: HealthSystem,
  mode: VizMode,
): void {
  material.uniforms.uMode!.value = mode === "cloud" ? 1 : 0;
  material.uniforms.uHighlight!.value = REGION_MAP[system];
}

export function applyFaceStyle(
  material: THREE.ShaderMaterial,
  style: FaceStyle,
): void {
  material.uniforms.uFace!.value = FACE_MAP[style];
}
