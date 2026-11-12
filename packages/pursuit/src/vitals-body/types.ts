export type BodySex = "male" | "female";
export type VizMode = "outline" | "cloud";
export type QualityPreset = "high" | "medium" | "low";
export type ViewPreset = "front" | "side" | "back" | "free";
export type ZoomPreset = "full" | "upper" | "lower";
export type HealthSystem = "full" | "cardiovascular" | "respiratory" | "movement";
export type AppearanceMode = "light" | "dark";

export interface VitalsParticleAsset {
  count: number;
  positions: Float32Array;
  normals: Float32Array;
  regions: Uint8Array;
  classes: Uint8Array;
}

export interface VitalsBodyTuning {
  particleScale: number;
  opacity: number;
  brightness: number;
  glow: number;
  edgeLight: number;
}

export const DEFAULT_TUNING: VitalsBodyTuning = {
  particleScale: 0.72,
  opacity: 0.58,
  brightness: 0.92,
  glow: 0.55,
  edgeLight: 0.72,
};
