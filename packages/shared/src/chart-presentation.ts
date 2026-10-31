import { countsOnTrack } from "./compete/ledger";
import { competeNow } from "./compete/engine";
import type { CompeteState } from "./compete/sports";
import { competePeriodWindow } from "./phone-views";
import { APP_TIMEZONE, dayKey, shiftAppDay, startOfZonedDay } from "./period";
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
  segments: string[];
  line: string; previous: string; points: ChartDatum[];
  value: string; date: string;
  left: number; right: number;
  xTicks: { x: number; label: string }[];
  yTicks: { y: number; label: string }[];
}

/** Equal-width Eastern days, including the 23/25-hour DST days. */
function calendarPosition(at: Date) {
  const start = startOfZonedDay(at), end = shiftAppDay(start, 1);
  return Date.parse(`${dayKey(at)}T00:00:00Z`) / 86400000
    + (at.getTime() - start.getTime()) / (end.getTime() - start.getTime());
}

export interface OpenLineTimeline {
  start: Date;
  end: Date;
  showTime?: boolean;
  step?: boolean;
  previousRows?: readonly { date: string; value: number }[];
  previousStart?: Date;
}

/** Presentation only: no smoothing, interpolation of observations, or scoring writes. */
export function openLineModel(
  rows: readonly { id: string; date: string; value: number; breakBefore?: boolean; inspectable?: boolean }[],
  format: (value: number) => string,
  previous: readonly number[] = [],
  slots = Math.max(rows.length, previous.length),
  timeline?: OpenLineTimeline,
): OpenLineModel {
  const width = 340, height = 190, top = 28, bottom = 146, left = 44, right = 326;
  const values = [...rows.map(row => row.value), ...previous, ...(timeline?.previousRows?.map(row => row.value) ?? [])];
  const low = values.length ? Math.min(...values) : 0, high = values.length ? Math.max(...values) : 1;
  const padding = Math.max(1, (high - low) * .12);
  // Score histories use a local domain; cumulative hour comparisons retain zero.
  const min = previous.length || timeline?.previousRows?.length ? Math.min(0, low) : low - padding;
  const max = high + padding;
  const y = (value: number) => bottom - (value - min) / (max - min || 1) * (bottom - top);
  const x = (i: number) => left + i / Math.max(1, slots - 1) * (right - left);
  const origin = timeline ? calendarPosition(timeline.start) : 0;
  const timeSpan = timeline ? Math.max(.001, calendarPosition(timeline.end) - origin) : 1;
  const previousOrigin = timeline?.previousStart ? calendarPosition(timeline.previousStart) : origin;
  const timeX = (at: string, previous = false) => left +
    (calendarPosition(new Date(at)) - (previous ? previousOrigin : origin)) / timeSpan * (right - left);
  const crossesYear = rows.length > 0 && dayKey(new Date(rows[0]!.date)).slice(0, 4) !== dayKey(new Date(rows[rows.length - 1]!.date)).slice(0, 4);
  const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", ...(crossesYear ? { year: "numeric" } : {}), timeZone: APP_TIMEZONE });
  const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE, timeZoneName: "short" });
  const date = (value: string) => dateFormatter.format(new Date(value));
  const points = rows.map((row, i) => ({ id: row.id, x: timeline ? timeX(row.date) : x(i), y: y(row.value), label: timeline?.showTime ? `${date(row.date)}, ${timeFormatter.format(new Date(row.date))}` : date(row.date), value: format(row.value) }));
  const trace = (pts: readonly { x: number; y: number }[]) => pts.flatMap((point, i) => [
    ...(timeline?.step && i ? [`${point.x.toFixed(1)},${pts[i - 1]!.y.toFixed(1)}`] : []),
    `${point.x.toFixed(1)},${point.y.toFixed(1)}`,
  ]).join(" ");
  const line = trace(points);
  const segments: string[] = [];
  let segment: typeof points = [];
  points.forEach((point, i) => {
    if (rows[i]?.breakBefore && segment.length) { segments.push(trace(segment)); segment = []; }
    segment.push(point);
  });
  if (segment.length) segments.push(trace(segment));
  const tickDates = timeline
    ? [timeline.start, shiftAppDay(timeline.start, Math.floor((calendarPosition(timeline.end) - calendarPosition(timeline.start)) / 2)), new Date(timeline.end.getTime() - 1)]
    : [rows[0], rows[Math.floor((rows.length - 1) / 2)], rows.at(-1)].map(row => row ? new Date(row.date) : undefined);
  const xTicks = tickDates.flatMap((at, i) => at ? [{ x: timeline ? timeX(at.toISOString()) : x([0, Math.floor((rows.length - 1) / 2), rows.length - 1][i]!), label: date(at.toISOString()) }] : [])
    .filter((tick, i, ticks) => ticks.findIndex(other => other.x === tick.x && other.label === tick.label) === i);
  return { width, height, top, bottom, left, right, points: points.filter((_, i) => rows[i]?.inspectable !== false), line, segments, xTicks,
    yTicks: [min, (min + max) / 2, max].map(value => ({ y: y(value), label: format(value) })),
    previous: timeline?.previousRows ? trace(timeline.previousRows.map(row => ({ x: timeX(row.date, true), y: y(row.value) }))) : previous.map((value, i) => `${x(i).toFixed(1)},${y(value).toFixed(1)}`).join(" "),
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
  if (range === "week") {
    const events = (from: Date, until: Date) => {
      let hours = 0;
      const exclusiveEnd = shiftAppDay(from, 7).getTime();
      const rows = [{ id: `start:${from.toISOString()}`, date: from.toISOString(), value: 0 }];
      for (const activity of eligible.filter(a => Date.parse(a.startedAt) >= from.getTime() && Date.parse(a.startedAt) <= until.getTime() && Date.parse(a.startedAt) < exclusiveEnd && a.movingSec > 0)
        .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt) || a.id.localeCompare(b.id))) {
        hours += activity.movingSec / 3600;
        rows.push({ id: activity.id, date: activity.startedAt, value: hours });
      }
      rows.push({ id: `end:${until.toISOString()}`, date: until.toISOString(), value: hours });
      return rows;
    };
    const end = shiftAppDay(start, 7);
    return openLineModel(now < start ? [] : events(start, new Date(Math.min(now.getTime(), end.getTime()))), value => value.toFixed(1), [], 7, {
      start, end, step: true, showTime: true,
      previousRows: events(previousStart, start), previousStart,
    });
  }
  return openLineModel(cumulative(start, elapsed), value => value.toFixed(1), cumulative(previousStart, days).map(row => row.value), days);
}

/** Shared zero-based bars and average, excluding future buckets on both platforms. */
export function benchmarkBars(buckets: readonly TrainingBucket[], now: Date) {
  const width = 340, height = 200, top = 28, bottom = 154, left = 32, right = 332;
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

/** Score events are committed changes, not estimates from activity distance. */
export function effortScoreLine(state: CompeteState, track: "open" | "verified", range: OpenLineRange, now = competeNow(state)) {
  const start = shiftAppDay(now, -(range === "week" ? 6 : range === "fourWeeks" ? 27 : 364));
  const end = shiftAppDay(now, 1);
  const recorded = (state.effortScoreEvents ?? []).filter(event => event.sport === state.primary && event.track === track
    && Number.isFinite(Date.parse(event.occurredAt)) && Date.parse(event.occurredAt) <= now.getTime()
    && Number.isFinite(event.scoreBefore) && Number.isFinite(event.scoreAfter))
    .slice().sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.id.localeCompare(b.id, "en", { numeric: true }));
  // Once durable recording begins, settlement is already part of those events.
  const firstRecordedAt = recorded[0] ? Date.parse(recorded[0].occurredAt) : Infinity;
  const legacy = state.periodResults.filter(result => result.sport === state.primary && result.track === track
    && Number.isFinite(Date.parse(result.periodEnd)) && Date.parse(result.periodEnd) < firstRecordedAt
    && Date.parse(result.periodEnd) <= now.getTime() && result.eloBefore !== result.eloAfter)
    .map(result => ({ id: `settlement:${result.id}`, occurredAt: result.periodEnd, scoreBefore: result.eloBefore, scoreAfter: result.eloAfter }));
  const events = [...legacy, ...recorded].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.id.localeCompare(b.id, "en", { numeric: true }));
  const rows: { id: string; date: string; value: number; breakBefore?: boolean; inspectable?: boolean }[] = [];
  const prior = recorded.filter(event => Date.parse(event.occurredAt) < start.getTime()).at(-1);
  if (prior) rows.push({ id: "baseline", date: start.toISOString(), value: prior.scoreAfter });
  for (const event of events.filter(event => Date.parse(event.occurredAt) >= start.getTime())) {
    if (!rows.length || rows.at(-1)!.value !== event.scoreBefore) rows.push({ id: `before:${event.id}`, date: new Date(Math.max(start.getTime(), Date.parse(event.occurredAt) - 1)).toISOString(), value: event.scoreBefore, breakBefore: true, inspectable: false });
    rows.push({ id: event.id, date: event.occurredAt, value: event.scoreAfter });
  }
  const rating = state.ratings.find(r => r.sport === state.primary);
  const current = (track === "open" ? rating?.openElo : rating?.verifiedElo) ?? 500;
  rows.push({ id: "current", date: now.toISOString(), value: current, breakBefore: !!rows.length && rows.at(-1)!.value !== current });
  return openLineModel(rows, value => String(Math.round(value)), [], 7, { start, end, showTime: range === "week", step: true });
}
