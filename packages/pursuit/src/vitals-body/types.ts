export type BodySex = "male" | "female";
/** Offline pipeline that produced the synced runtime asset bundle. */
export type BodyMeshSource = "anny" | "mpfb2";
export type VizMode = "outline" | "cloud";
export type QualityPreset = "high" | "medium" | "low";
export type ViewPreset = "front" | "side" | "back" | "free";
export type ZoomPreset = "full" | "upper" | "lower";
export type HealthSystem = "full" | "cardiovascular" | "respiratory" | "movement";
export type AppearanceMode = "light" | "dark";
export type FaceStyle = "mannequin" | "soft" | "natural";

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

/** Vitals lab defaults (cloud, medium density, soft face). */
export const DEFAULT_TUNING: VitalsBodyTuning = {
  particleScale: 0.18,
  opacity: 0.8,
  brightness: 1.0,
  glow: 0.74,
  edgeLight: 0.3,
};
