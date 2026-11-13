import type { AnalyticsLabModel, VitalId } from "./analytics-lab";

/** Six metrics flanking the interactive body scan (product Vitals Lab). */
export type VitalsLabMetricId =
  | "hrv"
  | "rhr"
  | "resp"
  | "spo2"
  | "sleep"
  | "active";

export type VitalsLabSystemId = "full" | "heart" | "breathing" | "movement";

export interface VitalsLabCamera {
  /** Orbit distance multiplier (~1 = full body). */
  zoom: number;
  /** Vertical focus offset (centered body space, + = higher on body). */
  panY: number;
  /** Yaw offset radians from front. */
  targetRotY: number;
}

export interface VitalsLabAnchor3D {
  x: number;
  y: number;
  z: number;
}

export interface VitalsLabValuePart {
  num: string;
  unit: string;
}

export interface VitalsLabMetricSpec {
  id: VitalsLabMetricId;
  label: string;
  fullTitle: string;
  unit: string;
  column: "left" | "right";
  row: number;
  system: VitalsLabSystemId;
  camera: VitalsLabCamera;
  anchor3D: VitalsLabAnchor3D;
  subtitle: string;
  description: string;
  /** Maps to analytics vital when available. */
  vitalId?: VitalId;
  colorDark: string;
  colorLight: string;
}

export interface VitalsLabMetricDisplay extends VitalsLabMetricSpec {
  value: string;
  displayParts?: VitalsLabValuePart[];
  status: string;
  delta: string;
  sparkline: number[];
}

export interface VitalsLabSystemPill {
  id: VitalsLabSystemId;
  label: string;
  defaultMetric: VitalsLabMetricId | null;
  headline: string;
  subline: string;
  camera: VitalsLabCamera;
}

export const VITALS_LAB_METRICS: readonly VitalsLabMetricSpec[] = [
  {
    id: "hrv",
    label: "HRV",
    fullTitle: "Heart rate variability",
    unit: "ms",
    column: "left",
    row: 0,
    system: "heart",
    vitalId: "hrv",
    colorDark: "#38BDF8",
    colorLight: "#0284C7",
    camera: { zoom: 1.58, panY: 0.25, targetRotY: 0.22 },
    anchor3D: { x: 0.0, y: 0.48, z: 0.035 },
    subtitle: "Last night’s autonomic reading · Deep parasympathetic rebound",
    description:
      "Vagal tone signal between your cranial brainstem and sinoatrial node indicates high autonomic readiness for high-strain output today.",
  },
  {
    id: "resp",
    label: "Respiration",
    fullTitle: "Respiratory rate",
    unit: "/min",
    column: "left",
    row: 1,
    system: "breathing",
    vitalId: "resp",
    colorDark: "#2DD4BF",
    colorLight: "#0D9488",
    camera: { zoom: 1.65, panY: 0.16, targetRotY: -0.18 },
    anchor3D: { x: -0.078, y: 0.34, z: 0.055 },
    subtitle: "Sleeping pulmonary cadence · Unobstructed tidal volume",
    description:
      "Bilateral bronchial ventilation stayed remarkably steady across all 4 REM cycles, reflecting low metabolic stress and clean airway efficiency.",
  },
  {
    id: "sleep",
    label: "Sleep",
    fullTitle: "Restorative sleep",
    unit: "",
    column: "left",
    row: 2,
    system: "full",
    colorDark: "#818CF8",
    colorLight: "#4F46E5",
    camera: { zoom: 1.52, panY: 0.34, targetRotY: 0.15 },
    anchor3D: { x: 0.0, y: 0.72, z: 0.045 },
    subtitle: "Cranial slow-wave synchronization · 94% sleep efficiency",
    description:
      "Strong delta-wave activity during the first 3 hours accelerated neuromuscular repair and endocrine restoration across your entire kinetic chain.",
  },
  {
    id: "rhr",
    label: "Resting HR",
    fullTitle: "Resting heart rate",
    unit: "bpm",
    column: "right",
    row: 0,
    system: "heart",
    vitalId: "rhr",
    colorDark: "#F3C65F",
    colorLight: "#D97706",
    camera: { zoom: 1.72, panY: 0.18, targetRotY: 0.25 },
    anchor3D: { x: 0.04, y: 0.33, z: 0.068 },
    subtitle: "Last night’s nadir reading · High stroke volume efficiency",
    description:
      "Your myocardium reached its lowest resting cadence at 4:18 AM, signaling strong cardiac output and complete clearance of yesterday’s training load.",
  },
  {
    id: "spo2",
    label: "Blood oxygen",
    fullTitle: "Blood oxygen saturation",
    unit: "%",
    column: "right",
    row: 1,
    system: "breathing",
    vitalId: "spo2",
    colorDark: "#38BDF8",
    colorLight: "#0284C7",
    camera: { zoom: 1.62, panY: 0.16, targetRotY: 0.28 },
    anchor3D: { x: 0.078, y: 0.33, z: 0.055 },
    subtitle: "Alveolar-arterial oxygen diffusion · Peripheral perfusion",
    description:
      "Hemoglobin saturation remained at peak capacity through the night, supporting mitochondrial ATP synthesis in peripheral muscle tissue.",
  },
  {
    id: "active",
    label: "Active time",
    fullTitle: "Kinetic active load",
    unit: "min",
    column: "right",
    row: 2,
    system: "movement",
    colorDark: "#F3C65F",
    colorLight: "#D97706",
    camera: { zoom: 1.32, panY: -0.22, targetRotY: -0.32 },
    anchor3D: { x: 0.102, y: -0.26, z: 0.048 },
    subtitle: "Musculoskeletal output · Posterior & anterior chain activation",
    description:
      "64 minutes of sustained metabolically active movement engaged your quadriceps, glutes, and calves without triggering excessive eccentric fatigue.",
  },
] as const;

export const VITALS_LAB_SYSTEM_PILLS: readonly VitalsLabSystemPill[] = [
  {
    id: "full",
    label: "Full body",
    defaultMetric: null,
    headline: "Your body, at a glance.",
    subline: "A simple shape. A fuller picture.",
    camera: { zoom: 1.0, panY: 0.0, targetRotY: 0.0 },
  },
  {
    id: "heart",
    label: "Heart",
    defaultMetric: "rhr",
    headline: "Resting heart rate · 52 bpm",
    subline: "Last night’s reading · 3 bpm below your 30-day baseline",
    camera: { zoom: 1.68, panY: 0.18, targetRotY: 0.22 },
  },
  {
    id: "breathing",
    label: "Breathing",
    defaultMetric: "resp",
    headline: "Respiration · 14.2 /min",
    subline: "98% SpO₂ saturation · Calm nocturnal pulmonary rhythm",
    camera: { zoom: 1.6, panY: 0.16, targetRotY: -0.18 },
  },
  {
    id: "movement",
    label: "Movement",
    defaultMetric: "active",
    headline: "Active time · 64 min",
    subline: "Balanced kinetic strain · Lower-body & core readiness 92%",
    camera: { zoom: 1.28, panY: -0.18, targetRotY: -0.28 },
  },
] as const;

export function vitalsLabSystemToHealth(
  system: VitalsLabSystemId,
): "full" | "cardiovascular" | "respiratory" | "movement" {
  switch (system) {
    case "heart":
      return "cardiovascular";
    case "breathing":
      return "respiratory";
    case "movement":
      return "movement";
    default:
      return "full";
  }
}

const DEFAULT_SPARK: Record<VitalsLabMetricId, number[]> = {
  hrv: [58, 61, 59, 64, 62, 65, 68],
  resp: [14.6, 14.4, 14.3, 14.5, 14.1, 14.2, 14.2],
  sleep: [6.8, 7.1, 7.4, 6.9, 7.5, 7.3, 7.7],
  rhr: [56, 55, 54, 55, 53, 53, 52],
  spo2: [97, 98, 98, 97, 99, 98, 98],
  active: [45, 52, 60, 38, 72, 58, 64],
};

const DEFAULT_VALUES: Record<
  VitalsLabMetricId,
  {
    value: string;
    displayParts?: VitalsLabValuePart[];
    status: string;
    delta: string;
  }
> = {
  hrv: {
    value: "68",
    status: "Optimal recovery",
    delta: "+6 ms vs. 30-day baseline",
  },
  resp: {
    value: "14.2",
    status: "Stable baseline",
    delta: "Within 0.2 br/min of baseline",
  },
  sleep: {
    value: "7h 42m",
    displayParts: [
      { num: "7", unit: "h " },
      { num: "42", unit: "m" },
    ],
    status: "94% efficiency",
    delta: "2h 18m Slow-Wave + REM",
  },
  rhr: {
    value: "52",
    status: "Athletic tier",
    delta: "3 bpm below 30-day average",
  },
  spo2: {
    value: "98",
    status: "Peak oxygenation",
    delta: "97–99% continuous nocturnal range",
  },
  active: {
    value: "64",
    status: "Balanced strain",
    delta: "Zone 2–4 aerobic & lower-limb load",
  },
};

function parseDurationParts(value: string): VitalsLabValuePart[] | undefined {
  const m = value.match(/^(\d+)h\s+(\d+)m$/i);
  if (!m) return undefined;
  return [
    { num: m[1]!, unit: "h " },
    { num: m[2]!, unit: "m" },
  ];
}

/** Native hybrid WebView bridge: 3D canvas only (no product chrome). */
export interface VitalsLabCanvasMessage {
  type: "vitals-lab-canvas";
  appearance: "light" | "dark";
  gender: "male" | "female";
  viewMode: "lumen" | "outline";
  activeMetric: VitalsLabMetricId | null;
  activeSystem: VitalsLabSystemId;
  zoom: number;
  panY: number;
  targetRotY: number;
  rotYStepNonce: number;
  autoOrbit: boolean;
  scanNonce: number;
  scanEnabled: boolean;
  anchor3D: VitalsLabAnchor3D | null;
  /** Absolute or root-relative base, e.g. https://host/bodies/anny */
  assetBaseUrl: string;
}

export function parseVitalsLabCanvasMessage(
  data: unknown,
): VitalsLabCanvasMessage | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (o.type !== "vitals-lab-canvas") return null;
  const appearance = o.appearance === "light" ? "light" : "dark";
  const gender = o.gender === "male" ? "male" : "female";
  const viewMode = o.viewMode === "outline" ? "outline" : "lumen";
  const activeSystem =
    o.activeSystem === "heart" ||
    o.activeSystem === "breathing" ||
    o.activeSystem === "movement"
      ? o.activeSystem
      : "full";
  const activeMetric =
    typeof o.activeMetric === "string" &&
    VITALS_LAB_METRICS.some((m) => m.id === o.activeMetric)
      ? (o.activeMetric as VitalsLabMetricId)
      : null;
  const num = (key: string, fallback: number) =>
    typeof o[key] === "number" && Number.isFinite(o[key])
      ? (o[key] as number)
      : fallback;
  const anchor =
    o.anchor3D &&
    typeof o.anchor3D === "object" &&
    typeof (o.anchor3D as VitalsLabAnchor3D).x === "number"
      ? (o.anchor3D as VitalsLabAnchor3D)
      : null;
  const assetBaseUrl =
    typeof o.assetBaseUrl === "string" ? o.assetBaseUrl : "/bodies/anny";
  return {
    type: "vitals-lab-canvas",
    appearance,
    gender,
    viewMode,
    activeMetric,
    activeSystem,
    zoom: num("zoom", 1),
    panY: num("panY", 0),
    targetRotY: num("targetRotY", 0),
    rotYStepNonce: num("rotYStepNonce", 0),
    autoOrbit: o.autoOrbit === true,
    scanNonce: num("scanNonce", 0),
    scanEnabled: o.scanEnabled !== false,
    anchor3D: anchor,
    assetBaseUrl,
  };
}

export function vitalsLabMetricsFromModel(
  model?: AnalyticsLabModel | null,
): VitalsLabMetricDisplay[] {
  return VITALS_LAB_METRICS.map((spec) => {
    const vital = spec.vitalId
      ? model?.vitals.metrics.find((m) => m.id === spec.vitalId)
      : undefined;
    const fallback = DEFAULT_VALUES[spec.id];
    const sparkline =
      vital?.series.map((p) => p.value) ?? DEFAULT_SPARK[spec.id];
    let value = fallback.value;
    if (vital) {
      if (spec.id === "spo2") {
        value = String(Math.min(100, Math.max(70, Math.round(vital.current))));
      } else if (spec.id === "rhr") {
        value = String(Math.max(38, Math.round(vital.current)));
      } else if (spec.id === "resp") {
        value = vital.current.toFixed(1);
      } else {
        value = vital.formattedCurrent
          .replace(/\s*(ms|bpm|brpm|%).*$/i, "")
          .trim();
      }
    }
    return {
      ...spec,
      value,
      displayParts:
        spec.id === "sleep"
          ? parseDurationParts(value) ?? fallback.displayParts
          : undefined,
      status: vital?.statusLabel ?? fallback.status,
      delta: vital?.deltaLabel ?? fallback.delta,
      sparkline,
    };
  });
}
