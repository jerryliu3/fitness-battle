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
  const teal = appearance === "dark" ? "#5fe8d6" : "#2aa89a";
  const gold = appearance === "dark" ? "#e8c468" : "#c49a3c";

  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uMode: { value: 0 },
      uHighlight: { value: 0 },
      uOpacity: { value: 0.9 },
      uBrightness: { value: 1 },
      uGlow: { value: 1.1 },
      uEdge: { value: 0.8 },
      uSize: { value: 3.2 },
      uAnimate: { value: reducedMotion ? 0 : 1 },
      uTeal: { value: new THREE.Color(teal) },
      uGold: { value: new THREE.Color(gold) },
    },
    vertexShader: /* glsl */ `
      attribute float aRegion;
      attribute float aClass;
      varying float vRegion;
      varying float vClass;
      varying float vRim;
      uniform float uSize;
      uniform float uEdge;
      void main() {
        vRegion = aRegion;
        vClass = aClass;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 nView = normalize(normalMatrix * normal);
        vec3 viewDir = normalize(-mv.xyz);
        vRim = pow(1.0 - max(0.0, dot(nView, viewDir)), 2.0) * uEdge;
        float classBoost = aClass < 1.5 ? 1.0 : 0.72;
        gl_PointSize = uSize * classBoost * (280.0 / -mv.z);
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
      uniform vec3 uTeal;
      uniform vec3 uGold;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r = length(c);
        if (r > 0.5) discard;
        float soft = smoothstep(0.5, 0.08, r);
        float pulse = uAnimate > 0.5
          ? 0.92 + 0.08 * sin(uTime * 1.2 + vRegion * 3.0)
          : 1.0;

        vec3 base = mix(uTeal, uGold, clamp(vRim * 0.35, 0.0, 1.0));
        float interiorFade = (uMode > 0.5 && vClass > 1.5) ? 0.55 : 1.0;
        float highlight = 1.0;
        if (uHighlight > 0.5) {
          highlight = abs(vRegion - uHighlight) < 0.5 ? 1.55 : 0.35;
        }
        vec3 col = base * uBrightness * pulse * highlight * interiorFade;
        col += vRim * uGold * uGlow * 0.4;
        float alpha = soft * uOpacity * highlight * interiorFade;
        if (uMode < 0.5 && vClass > 1.5) alpha *= 0.15;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

export function setAppearance(
  material: THREE.ShaderMaterial,
  appearance: AppearanceMode,
  renderer: THREE.WebGLRenderer,
): void {
  const teal = appearance === "dark" ? "#5fe8d6" : "#2aa89a";
  const gold = appearance === "dark" ? "#e8c468" : "#c49a3c";
  (material.uniforms.uTeal!.value as THREE.Color).set(teal);
  (material.uniforms.uGold!.value as THREE.Color).set(gold);
  renderer.toneMappingExposure = appearance === "dark" ? 1.15 : 1.05;
}

export function applyHighlight(
  material: THREE.ShaderMaterial,
  system: HealthSystem,
  mode: VizMode,
): void {
  material.uniforms.uMode!.value = mode === "cloud" ? 1 : 0;
  material.uniforms.uHighlight!.value = REGION_MAP[system];
}
