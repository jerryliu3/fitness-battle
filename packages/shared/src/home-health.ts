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
    { id: "steps", name: "Steps", unit: "steps", value: "—", context: "Not available", history: [], detail: "Daily step totals are not connected yet. Workout distance is not a daily step count." },
    { id: "resting-hr", name: "Resting HR", unit: "bpm", value: "—", context: "bpm · Not available", history: [], detail: "Resting heart rate is not connected yet. Workout average heart rate is a separate measurement." },
    { id: "hrv", name: "HRV", unit: "ms", value: "—", context: "ms · Not available", history: [], detail: "Heart rate variability is not connected yet. No readiness score or target is inferred." },
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
