import { countsOnTrack } from "./compete/ledger";
import { competeNow } from "./compete/engine";
import type { CompeteState } from "./compete/sports";
import { competePeriodWindow } from "./phone-views";
import { APP_TIMEZONE, dayKey, shiftAppDay } from "./period";
import type { ChartDatum } from "./chart-scrubber";
import type { TrainingBucket } from "./training-view";

export type OpenLineRange = "week" | "fourWeeks" | "year";
export const OPEN_LINE_RANGES: readonly { value: OpenLineRange; label: string; ariaLabel: string }[] = [
  { value: "week", label: "1W", ariaLabel: "One week" },
  { value: "fourWeeks", label: "4W", ariaLabel: "Four weeks" },
  { value: "year", label: "1Y", ariaLabel: "One year" },
];

export interface OpenLineModel {
  width: number; height: number; top: number; bottom: number;
  line: string; previous: string; points: ChartDatum[];
  value: string; date: string;
}

/** Presentation only: no smoothing, interpolation of observations, or scoring writes. */
export function openLineModel(
  rows: readonly { id: string; date: string; value: number }[],
  format: (value: number) => string,
  previous: readonly number[] = [],
  slots = Math.max(rows.length, previous.length),
): OpenLineModel {
  const width = 340, height = 190, top = 16, bottom = 174;
  const values = [...rows.map(row => row.value), ...previous];
  const low = values.length ? Math.min(...values) : 0, high = values.length ? Math.max(...values) : 1;
  const padding = Math.max(1, (high - low) * .12);
  // Score histories use a local domain; cumulative hour comparisons retain zero.
  const min = previous.length ? Math.min(0, low) : low - padding;
  const max = high + padding;
  const y = (value: number) => bottom - (value - min) / (max - min || 1) * (bottom - top);
  const x = (i: number) => 4 + i / Math.max(1, slots - 1) * 332;
  const crossesYear = rows.length > 0 && dayKey(new Date(rows[0]!.date)).slice(0, 4) !== dayKey(new Date(rows[rows.length - 1]!.date)).slice(0, 4);
  const date = (value: string) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(crossesYear ? { year: "numeric" } : {}), timeZone: APP_TIMEZONE });
  const points = rows.map((row, i) => ({ id: row.id, x: x(i), y: y(row.value), label: date(row.date), value: format(row.value) }));
  const line = points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  return { width, height, top, bottom, points, line,
    previous: previous.map((value, i) => `${x(i).toFixed(1)},${y(value).toFixed(1)}`).join(" "),
    value: rows.length ? format(rows[rows.length - 1]!.value) : format(0),
    date: rows.length ? `${date(rows[0]!.date)} – ${date(rows[rows.length - 1]!.date)}` : "No data",
  };
}

/** Current Eastern competition week, optionally preceded by three complete weeks. */
export function homeTrainingLine(state: CompeteState, range: "week" | "fourWeeks" = "week", now = competeNow(state)) {
  const period = competePeriodWindow(state, now), days = range === "week" ? 7 : 28;
  const start = shiftAppDay(period.startsAt, -(days - 7));
  const previousStart = shiftAppDay(start, -days);
  const eligible = state.activities.filter(activity => countsOnTrack(activity, "open") && Date.parse(activity.startedAt) <= now.getTime());
  const byDay = new Map<string, number>();
  for (const activity of eligible) {
    const key = dayKey(new Date(activity.startedAt));
    byDay.set(key, (byDay.get(key) ?? 0) + Math.max(0, activity.movingSec));
  }
  const cumulative = (from: Date, count: number) => {
    let hours = 0;
    return Array.from({ length: count }, (_, i) => {
      const at = shiftAppDay(from, i), id = dayKey(at);
      hours += (byDay.get(id) ?? 0) / 3600;
      return { id, date: at.toISOString(), value: hours };
    });
  };
  const elapsed = Array.from({ length: days }, (_, i) => shiftAppDay(start, i)).filter(at => dayKey(at) <= dayKey(now)).length;
  return openLineModel(cumulative(start, elapsed), value => value.toFixed(1), cumulative(previousStart, days).map(row => row.value), days);
}

/** Shared zero-based bars and average, excluding future buckets on both platforms. */
export function benchmarkBars(buckets: readonly TrainingBucket[], now: Date) {
  const width = 340, height = 200, top = 22, bottom = 170, left = 32, right = 332;
  const recorded = buckets.filter(bucket => Date.parse(bucket.start) <= now.getTime());
  const average = recorded.length ? recorded.reduce((sum, bucket) => sum + bucket.movingSec, 0) / recorded.length : 0;
  const max = Math.max(3600, ...buckets.map(bucket => bucket.movingSec)) * 1.15;
  const y = (seconds: number) => bottom - seconds / max * (bottom - top);
  const slot = (right - left) / Math.max(1, buckets.length);
  const bars = buckets.map((bucket, i) => ({ ...bucket, x: left + (i + .5) * slot, y: y(bucket.movingSec), future: Date.parse(bucket.start) > now.getTime() }));
  const points = bars.filter(bar => !bar.future).map(bar => ({ id: bar.start, x: bar.x, y: bar.y,
    label: new Date(bar.start).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE }), value: (bar.movingSec / 3600).toFixed(1) }));
  return { width, height, top, bottom, left, right, bars, points, barWidth: slot * .62, average, averageY: y(average),
    ticks: [0, max / 2, max].map(value => ({ label: (value / 3600).toFixed(1), y: y(value) })),
  };
}
