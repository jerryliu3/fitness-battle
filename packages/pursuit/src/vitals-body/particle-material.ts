import * as THREE from "three";
import type { AppearanceMode, HealthSystem, VizMode } from "./types";

const REGION_MAP: Record<HealthSystem, number> = {
  full: 0,
  cardiovascular: 1,
  respiratory: 2,
  movement: 3,
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
      uOpacity: { value: 0.7 },
      uBrightness: { value: 0.9 },
      uGlow: { value: 0.65 },
      uEdge: { value: 0.75 },
      uSize: { value: 1.1 },
      uAnimate: { value: reducedMotion ? 0 : 1 },
      uTeal: { value: new THREE.Color() },
      uGold: { value: new THREE.Color() },
      uRimMix: { value: 0.35 },
    },
    vertexShader: /* glsl */ `
      attribute float aRegion;
      attribute float aClass;
      varying float vRegion;
      varying float vClass;
      varying float vRim;
      uniform float uSize;
      uniform float uEdge;
      uniform float uMode;
      void main() {
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
        gl_PointSize = uSize * classBoost * cloudBoost * (64.0 / dist);
        gl_PointSize = min(gl_PointSize, 14.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vRegion;
      varying float vClass;
      varying float vRim;
      uniform float uTime;
      uniform float uMode;
      uniform float uHighlight;
      uniform float uOpacity;
      uniform float uBrightness;
      uniform float uGlow;
      uniform float uAnimate;
      uniform float uRimMix;
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
        float interiorFade = (uMode > 0.5 && vClass > 1.5) ? 0.38 : 1.0;
        float highlight = 1.0;
        if (uHighlight > 0.5) {
          highlight = abs(vRegion - uHighlight) < 0.5 ? 1.45 : 0.42;
        }
        vec3 col = base * uBrightness * pulse * highlight * interiorFade;
        col += vRim * uGold * uGlow * 0.22;

        float alpha = soft * uOpacity * highlight * interiorFade;
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

  const teal = dark ? "#5fe8d6" : "#167a6d";
  const gold = dark ? "#e8c468" : "#8a6b2a";
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
