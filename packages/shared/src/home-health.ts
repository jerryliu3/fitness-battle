import { competeNow } from "./compete/engine";
import { collapseNights, formatSleepDuration, type SleepNight } from "./compete/health";
import type { CompeteState } from "./compete/sports";
import { INTEGRATIONS } from "./fitness/providers";
import { dayKey, shiftAppDay } from "./period";

export interface HomeHealthMetric {
  id: "sleep" | "steps" | "resting-hr" | "hrv";
  name: string;
  value: string;
  context: string;
  unit: string;
  detail: string;
  /** Seven calendar days, oldest first. Missing readings remain gaps. */
  history: (number | null)[];
}

/** Known preview readings must not be presented as connected tracker data. */
export function isSampleSleepNight(state: CompeteState, night: SleepNight): boolean {
  return night.source === "history" || night.id === `sleep-${night.source}-${night.day}` ||
    state.links.some(link => link.provider === night.source && link.status === "stub");
}

/** Presentation only. Do not infer daily health from workout HR/cadence or sleep scores. */
export function homeHealthMetrics(state: CompeteState, now = competeNow(state)): HomeHealthMetric[] {
  const today = dayKey(now);
  const nights = collapseNights(state.sleepNights.filter(night =>
    !isSampleSleepNight(state, night) &&
    night.day <= today && Number.isFinite(night.durationMin) && night.durationMin > 0,
  ));
  const night = nights.find(item => item.day === today);
  const latest = nights.at(-1);
  const source = night ? INTEGRATIONS.find(item => item.id === night.source)?.name ?? "Manual entry" : null;
  const history = Array.from({ length: 7 }, (_, index) =>
    nights.find(item => item.day === dayKey(shiftAppDay(now, index - 6)))?.durationMin ?? null,
  );
  return [
    {
      id: "sleep", name: "Sleep", unit: "", value: night ? formatSleepDuration(night.durationMin) : "—",
      context: night ? "Last night" : "No reading today", history,
      detail: night
        ? `${source} · wake date ${night.day}. Recorded sleep duration; not a readiness score.`
        : latest ? `No sleep reading for today. Last recorded wake date: ${latest.day}.` : "No sleep duration recorded yet. Available tracker readings appear after sync.",
    },
    ...([{ id: "steps", name: "Steps", unit: "steps", key: "steps" }, { id: "resting-hr", name: "Resting HR", unit: "bpm", key: "restingHr" }, { id: "hrv", name: "HRV", unit: "ms", key: "hrv" }] as const).map(spec => {
      const readings = (state.dailyHealth ?? []).filter((r) => {
        const val = r[spec.key];
        return r.day <= today && typeof val === "number" && Number.isFinite(val) && (spec.key === "restingHr" ? val > 0 : val >= 0);
      });
      const sortedReadings = [...readings].sort((a, b) => b.day.localeCompare(a.day));
      const preferred = sortedReadings.find((r) => r.day === today)?.provider ?? sortedReadings[0]?.provider;
      const forDay = (day: string) => sortedReadings.find((r) => r.day === day && (spec.key !== "hrv" || r.provider === preferred));
      const current = forDay(today);
      const value = current?.[spec.key];
      const providerName = current ? INTEGRATIONS.find((p) => p.id === current.provider)?.name ?? current.provider : null;
      return {
        id: spec.id,
        name: spec.name,
        unit: spec.unit,
        value: value == null ? "—" : Math.round(value).toLocaleString("en-US"),
        context: current ? "Today" : "Not available",
        detail: current
          ? `${providerName} · recorded ${today}.${spec.key === "hrv" && current.provider === "apple_health" ? " SDNN, daily sample average; not RMSSD." : ""}`
          : `No recorded ${spec.name.toLowerCase()} available for today.`,
        history: Array.from({ length: 7 }, (_, i) => forDay(dayKey(shiftAppDay(now, i - 6)))?.[spec.key] ?? null),
      };
    }),
  ];
}

/** Normalize only recorded samples; keep missing calendar days disconnected. */
export function healthSparkline(history: readonly (number | null)[]) {
  const values = history.filter((value): value is number => value != null && Number.isFinite(value));
  if (!values.length) return { segments: [] as string[], dots: [] as { x: number; y: number }[] };
  const low = Math.min(...values), span = Math.max(1, Math.max(...values) - low);
  const segments: string[] = [], dots: { x: number; y: number }[] = [];
  let current: string[] = [];
  history.forEach((value, index) => {
    if (value == null || !Number.isFinite(value)) {
      if (current.length) segments.push(current.join(" "));
      current = [];
      return;
    }
    const point = { x: 4 + index / Math.max(1, history.length - 1) * 72, y: 28 - (value - low) / span * 20 };
    dots.push(point);
    current.push(`${point.x.toFixed(1)},${point.y.toFixed(1)}`);
  });
  if (current.length) segments.push(current.join(" "));
  return { segments, dots };
}

/** Zero-based visual magnitude; the observed seven-day maximum is not a goal. */
export function healthSignal(history: readonly (number | null)[]) {
  const reading = history.at(-1);
  const available = reading != null && Number.isFinite(reading) && reading >= 0;
  const maximum = Math.max(0, ...history.filter((value): value is number => value != null && Number.isFinite(value) && value >= 0));
  const fraction = available && maximum > 0 ? reading / maximum : 0;
  const point = (angle: number, radius = 54) => ({ x: 72 + Math.cos(angle * Math.PI / 180) * radius, y: 72 + Math.sin(angle * Math.PI / 180) * radius });
  const arc = (end: number) => {
    const from = point(135), to = point(end);
    return `M${from.x},${from.y} A54,54 0 ${end - 135 > 180 ? 1 : 0} 1 ${to.x},${to.y}`;
  };
  return { available, maximum, fraction, track: arc(405), fill: fraction > 0 ? arc(135 + fraction * 270) : null,
    ticks: [0, .25, .5, .75, 1].map(position => ({ outer: point(135 + position * 270, 65), inner: point(135 + position * 270, 61) })) };
}

/** Observed min/max, separate from the filled dial’s zero-based scale. */
export function healthSignalRange(metric: HomeHealthMetric): string {
  if (!healthSignal(metric.history).available) return "No reading available";
  const values = metric.history.filter((value): value is number => value != null && Number.isFinite(value) && value >= 0);
  const format = metric.id === "sleep" ? formatSleepDuration : (value: number) => value.toLocaleString("en-US");
  return `${format(Math.min(...values))}–${format(Math.max(...values))} (7 day range)`;
}

export interface HealthMetricCorridor {
  low: number;
  high: number;
  formattedRange: string;
  format: (value: number) => string;
}

export function getHealthMetricCorridor(metricId: string): HealthMetricCorridor {
  switch (metricId) {
    case "sleep":
      return { low: 420, high: 540, formattedRange: "7h–9h", format: (m) => formatSleepDuration(m) };
    case "steps":
      return { low: 7500, high: 11000, formattedRange: "7,500–11,000 steps", format: (s) => Math.round(s).toLocaleString("en-US") };
    case "resting-hr":
      return { low: 50, high: 65, formattedRange: "50–65 bpm", format: (r) => `${Math.round(r)} bpm` };
    case "hrv":
    default:
      return { low: 62, high: 82, formattedRange: "62–82 ms", format: (h) => `${Math.round(h)} ms` };
  }
}

export interface Health7DayPoint {
  index: number;
  dayLabel: string;
  value: number | null;
  formatted: string;
  x: number;
  y: number | null;
  position: "under" | "in" | "over" | "missing";
}

export interface Health7DayChartModel {
  metricId: string;
  metricName: string;
  unit: string;
  baselineLow: number;
  baselineHigh: number;
  formattedRange: string;
  width: number;
  height: number;
  points: Health7DayPoint[];
  lineSegments: string[];
  corridorYTop: number;
  corridorYBottom: number;
  corridorAreaPath: string;
  hasUnder: boolean;
  hasAnyData: boolean;
}

export function buildHealth7DayCorridorModel(
  metric: HomeHealthMetric,
  now = new Date(),
): Health7DayChartModel {
  const corridor = getHealthMetricCorridor(metric.id);
  const width = 320;
  const height = 116;
  const left = 38;
  const right = 304;
  const plotTop = 18;
  const plotBottom = 86;

  const validValues = metric.history.filter((v): v is number => v != null && Number.isFinite(v));
  const allNums = [...validValues, corridor.low, corridor.high];
  const minVal = Math.min(...allNums);
  const maxVal = Math.max(...allNums);
  const spread = maxVal - minVal;
  const pad = Math.max(spread * 0.18, metric.id === "sleep" ? 30 : 4);
  const yMin = minVal - pad;
  const yMax = maxVal + pad;
  const span = Math.max(1, yMax - yMin);

  const toY = (v: number) => Number((plotBottom - ((v - yMin) / span) * (plotBottom - plotTop)).toFixed(1));
  const corridorYTop = toY(corridor.high);
  const corridorYBottom = toY(corridor.low);
  const corridorAreaPath = `M ${left},${corridorYTop} L ${right},${corridorYTop} L ${right},${corridorYBottom} L ${left},${corridorYBottom} Z`;

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const points: Health7DayPoint[] = metric.history.map((val, i) => {
    const x = Number((left + (i / 6) * (right - left)).toFixed(1));
    const isToday = i === 6;
    const targetDate = shiftAppDay(now, i - 6);
    const dayLabel = isToday ? "Today" : WEEKDAYS[targetDate.getDay()] ?? "";

    if (val == null || !Number.isFinite(val)) {
      return {
        index: i,
        dayLabel,
        value: null,
        formatted: "—",
        x,
        y: null,
        position: "missing" as const,
      };
    }

    const y = toY(val);
    const position = val < corridor.low ? ("under" as const) : val > corridor.high ? ("over" as const) : ("in" as const);
    return {
      index: i,
      dayLabel,
      value: val,
      formatted: corridor.format(val),
      x,
      y,
      position,
    };
  });

  const lineSegments: string[] = [];
  let currentSegment: string[] = [];
  for (const pt of points) {
    if (pt.y != null) {
      currentSegment.push(`${pt.x},${pt.y}`);
    } else if (currentSegment.length > 0) {
      if (currentSegment.length > 1) {
        lineSegments.push(`M ${currentSegment.join(" L ")}`);
      }
      currentSegment = [];
    }
  }
  if (currentSegment.length > 1) {
    lineSegments.push(`M ${currentSegment.join(" L ")}`);
  }

  return {
    metricId: metric.id,
    metricName: metric.name,
    unit: metric.unit,
    baselineLow: corridor.low,
    baselineHigh: corridor.high,
    formattedRange: corridor.formattedRange,
    width,
    height,
    points,
    lineSegments,
    corridorYTop,
    corridorYBottom,
    corridorAreaPath,
    hasUnder: points.some((p) => p.position === "under"),
    hasAnyData: validValues.length > 0,
  };
}
