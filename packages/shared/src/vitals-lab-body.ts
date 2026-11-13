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
  /** Vertical focus offset (meters, + = higher on body). */
  panY: number;
  /** Yaw offset radians from front. */
  targetRotY: number;
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
  /** Maps to analytics vital when available. */
  vitalId?: VitalId;
  colorDark: string;
  colorLight: string;
}

export interface VitalsLabMetricDisplay extends VitalsLabMetricSpec {
  value: string;
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
    colorDark: "#6CE5E8",
    colorLight: "#0E7C86",
    camera: { zoom: 1.58, panY: 0.25, targetRotY: 0.22 },
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
    colorDark: "#F3C952",
    colorLight: "#D99B16",
    camera: { zoom: 1.72, panY: 0.18, targetRotY: 0.25 },
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
    colorDark: "#6CE5E8",
    colorLight: "#0284C7",
    camera: { zoom: 1.62, panY: 0.16, targetRotY: 0.28 },
  },
  {
    id: "active",
    label: "Active time",
    fullTitle: "Kinetic active load",
    unit: "min",
    column: "right",
    row: 2,
    system: "movement",
    colorDark: "#F3C952",
    colorLight: "#D99B16",
    camera: { zoom: 1.32, panY: -0.22, targetRotY: -0.32 },
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
    headline: "Resting heart rate",
    subline: "Cardiac recovery & stroke volume",
    camera: { zoom: 1.68, panY: 0.18, targetRotY: 0.22 },
  },
  {
    id: "breathing",
    label: "Breathing",
    defaultMetric: "resp",
    headline: "Respiration & SpO₂",
    subline: "Pulmonary rhythm & oxygen diffusion",
    camera: { zoom: 1.6, panY: 0.16, targetRotY: -0.18 },
  },
  {
    id: "movement",
    label: "Movement",
    defaultMetric: "active",
    headline: "Active time",
    subline: "Lower-body kinetic readiness",
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

const DEMO_SPARK: Record<VitalsLabMetricId, number[]> = {
  hrv: [58, 61, 59, 64, 62, 65, 68],
  resp: [14.6, 14.4, 14.3, 14.5, 14.1, 14.2, 14.2],
  sleep: [6.8, 7.1, 7.4, 6.9, 7.5, 7.3, 7.7],
  rhr: [56, 55, 54, 55, 53, 53, 52],
  spo2: [97, 98, 98, 97, 99, 98, 98],
  active: [45, 52, 60, 38, 72, 58, 64],
};

const DEMO_VALUES: Record<
  VitalsLabMetricId,
  { value: string; status: string; delta: string }
> = {
  hrv: { value: "68", status: "Optimal recovery", delta: "+6 ms vs. 30-day baseline" },
  resp: { value: "14.2", status: "Stable baseline", delta: "Within 0.2 br/min of baseline" },
  sleep: { value: "7h 42m", status: "94% efficiency", delta: "2h 18m Slow-Wave + REM" },
  rhr: { value: "52", status: "Athletic tier", delta: "3 bpm below 30-day average" },
  spo2: { value: "98", status: "Peak oxygenation", delta: "97–99% nocturnal range" },
  active: { value: "64", status: "Balanced strain", delta: "Zone 2–4 aerobic load" },
};

export function vitalsLabMetricsFromModel(
  model?: AnalyticsLabModel | null,
): VitalsLabMetricDisplay[] {
  return VITALS_LAB_METRICS.map((spec) => {
    const vital = spec.vitalId
      ? model?.vitals.metrics.find((m) => m.id === spec.vitalId)
      : undefined;
    const demo = DEMO_VALUES[spec.id];
    const sparkline =
      vital?.series.map((p) => p.value) ?? DEMO_SPARK[spec.id];
    let value = demo.value;
    if (vital) {
      if (spec.id === "spo2") {
        value = String(Math.round(vital.current));
      } else if (spec.id === "resp") {
        value = vital.current.toFixed(1);
      } else {
        value = vital.formattedCurrent.replace(/\s*(ms|bpm|brpm|%).*$/i, "").trim();
      }
    }
    return {
      ...spec,
      value,
      status: vital?.statusLabel ?? demo.status,
      delta: vital?.deltaLabel ?? demo.delta,
      sparkline,
    };
  });
}

export interface VitalsLabSceneMessage {
  type: "vitals-lab";
  appearance: "light" | "dark";
  sex: "male" | "female";
  vizMode: "cloud" | "outline";
  system: VitalsLabSystemId;
  metricId: VitalsLabMetricId | null;
  view: "front" | "side" | "back";
  scanGeneration: number;
  autoOrbit: boolean;
}

export function parseVitalsLabSceneMessage(
  data: unknown,
): VitalsLabSceneMessage | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (o.type !== "vitals-lab") return null;
  const appearance = o.appearance === "light" ? "light" : "dark";
  const sex = o.sex === "female" ? "female" : "male";
  const vizMode = o.vizMode === "outline" ? "outline" : "cloud";
  const system =
    o.system === "heart" ||
    o.system === "breathing" ||
    o.system === "movement"
      ? o.system
      : "full";
  const metricId =
    typeof o.metricId === "string" &&
    VITALS_LAB_METRICS.some((m) => m.id === o.metricId)
      ? (o.metricId as VitalsLabMetricId)
      : null;
  const view =
    o.view === "side" || o.view === "back" ? o.view : "front";
  const scanGeneration =
    typeof o.scanGeneration === "number" && Number.isFinite(o.scanGeneration)
      ? o.scanGeneration
      : 0;
  const autoOrbit = o.autoOrbit === true;
  return {
    type: "vitals-lab",
    appearance,
    sex,
    vizMode,
    system,
    metricId,
    view,
    scanGeneration,
    autoOrbit,
  };
}
