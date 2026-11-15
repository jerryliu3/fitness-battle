import { countsForTraining } from "./compete/journal";
import { competeNow } from "./compete/engine";
import type { CompeteState } from "./compete/sports";
import { APP_TIMEZONE, accountTimeZone, dayKey, shiftAppDay, shiftZonedDay, startOfZonedDay, weeklyPeriodBounds } from "./period";
import type { ChartDatum } from "./chart-scrubber";
import { earliestDataDate, type TrainingBucket } from "./training-view";

export type OpenLineRange = "week" | "fourWeeks" | "year";
export type EffortHistoryRange = OpenLineRange | "twelveWeeks" | "twentyFourWeeks";
export const OPEN_LINE_RANGES: readonly { value: OpenLineRange; label: string; ariaLabel: string }[] = [
  { value: "week", label: "1W", ariaLabel: "One week" },
  { value: "fourWeeks", label: "1M", ariaLabel: "One month" },
  { value: "year", label: "1Y", ariaLabel: "One year" },
];

/** Inclusive Eastern lookback excluding today: 7 / 28 / 84 / 168 / 365 calendar days. */
export function effortScoreLookbackDays(range: EffortHistoryRange): number {
  return range === "week" ? 6
    : range === "fourWeeks" ? 27
    : range === "twelveWeeks" ? 83
    : range === "twentyFourWeeks" ? 167
    : 364;
}

export interface OpenLineModel {
  width: number; height: number; top: number; bottom: number;
  segments: string[];
  bridges?: string[];
  trendLine: string;
  line: string; points: ChartDatum[];
  value: string; date: string;
  left: number; right: number;
  xTicks: { x: number; label: string; anchor?: "start" | "middle" | "end" }[];
  yTicks: { y: number; label: string }[];
}

/** Equal-width calendar days in `timeZone`, including 23/25-hour DST days. */
function calendarPosition(at: Date, timeZone: string = APP_TIMEZONE) {
  const start = startOfZonedDay(at, timeZone);
  const end = shiftZonedDay(start, 1, timeZone);
  return Date.parse(`${dayKey(at, timeZone)}T00:00:00Z`) / 86400000
    + (at.getTime() - start.getTime()) / (end.getTime() - start.getTime());
}

export interface OpenLineTimeline {
  start: Date;
  end: Date;
  showTime?: boolean;
  step?: boolean;
  zeroMin?: boolean;
  timeZone?: string;
}

/** Presentation only: no smoothing, interpolation of observations, or scoring writes. */
export function openLineModel(
  rows: readonly { id: string; date: string; value: number; breakBefore?: boolean; inspectable?: boolean }[],
  format: (value: number) => string,
  slots = rows.length,
  timeline?: OpenLineTimeline,
  zeroMin = false,
): OpenLineModel {
  const width = 340, height = 172, top = 28, bottom = 146, left = 44, right = 326;
  const values = rows.map(row => row.value);
  const low = values.length ? Math.min(...values) : 0, high = values.length ? Math.max(...values) : 1;
  const padding = Math.max(1, (high - low) * .12);
  // Score histories use a local domain; cumulative hour charts retain a zero floor.
  const floorZero = Boolean(zeroMin || timeline?.zeroMin);
  const min = Math.floor(floorZero ? Math.min(0, low) : low - padding);
  const max = Math.ceil(high + padding);
  const y = (value: number) => bottom - (value - min) / (max - min || 1) * (bottom - top);
  const x = (i: number) => left + i / Math.max(1, slots - 1) * (right - left);
  const displayTz = timeline?.timeZone ?? APP_TIMEZONE;
  const pos = (at: Date) => calendarPosition(at, displayTz);
  const origin = timeline ? pos(timeline.start) : 0;
  const timeSpan = timeline ? Math.max(.001, pos(timeline.end) - origin) : 1;
  const timeX = (at: string) => left + (pos(new Date(at)) - origin) / timeSpan * (right - left);
  const crossesYear = rows.length > 0 && dayKey(new Date(rows[0]!.date), displayTz).slice(0, 4) !== dayKey(new Date(rows[rows.length - 1]!.date), displayTz).slice(0, 4);
  const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", ...(crossesYear ? { year: "numeric" } : {}), timeZone: displayTz });
  const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: displayTz });
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
    ? [timeline.start, shiftZonedDay(timeline.start, Math.floor((pos(timeline.end) - pos(timeline.start)) / 2), displayTz), new Date(timeline.end.getTime() - 1)]
    : [rows[0], rows[Math.floor((rows.length - 1) / 2)], rows.at(-1)].map(row => row ? new Date(row.date) : undefined);
  const xTicks = tickDates.flatMap((at, i) => at ? [{ x: timeline ? timeX(at.toISOString()) : x([0, Math.floor((rows.length - 1) / 2), rows.length - 1][i]!), label: date(at.toISOString()) }] : [])
    .filter((tick, i, ticks) => ticks.findIndex(other => other.x === tick.x && other.label === tick.label) === i);

  // Rolling 30-day average trendline across observed rows (excluding synthetic step-before points).
  const trendPts: string[] = [];
  const trendRows = rows
    .map((row, idx) => ({ row, x: points[idx]!.x }))
    .filter(({ row }) => !row.id.startsWith("before:"));
  if (trendRows.length >= 2) {
    const windowMs = 30 * 86400000;
    for (let i = 0; i < trendRows.length; i++) {
      const rowMs = Date.parse(trendRows[i]!.row.date);
      let sum = 0;
      let count = 0;
      for (let j = i; j >= 0; j--) {
        const jMs = Date.parse(trendRows[j]!.row.date);
        const inWindow = Number.isFinite(rowMs) && Number.isFinite(jMs)
          ? rowMs - jMs <= windowMs
          : i - j < 30;
        if (!inWindow) break;
        sum += trendRows[j]!.row.value;
        count += 1;
      }
      const avg = count > 0 ? sum / count : trendRows[i]!.row.value;
      trendPts.push(`${trendRows[i]!.x.toFixed(1)},${y(avg).toFixed(1)}`);
    }
  }
  const trendLine = trendPts.join(" ");

  return { width, height, top, bottom, left, right, points: points.filter((_, i) => rows[i]?.inspectable !== false), line, trendLine, segments, xTicks,
    yTicks: values.length ? [min, Math.min(max, min + Math.ceil((max - min) / 2)), max].filter((value, i, ticks) => ticks.indexOf(value) === i).map(value => ({ y: y(value), label: String(value) })) : [],
    value: rows.length ? format(rows[rows.length - 1]!.value) : format(0),
    date: rows.length ? `${date(rows[0]!.date)} – ${date(rows[rows.length - 1]!.date)}` : "No data",
  };
}

/** Current account-calendar training week (Monday–Monday), optionally preceded by three complete weeks. */
export function homeTrainingLine(state: CompeteState, range: "week" | "fourWeeks" = "week", now = competeNow(state), createdAt?: string | null) {
  const displayTz = accountTimeZone(state);
  const period = weeklyPeriodBounds(now, displayTz), days = range === "week" ? 7 : 28;
  const start = shiftZonedDay(period.startsAt, -(days - 7), displayTz);
  const earliest = earliestDataDate(state, now, createdAt);
  const clampedStart = earliest && earliest.getTime() > start.getTime() && (range === "fourWeeks" || Boolean(createdAt))
    ? startOfZonedDay(earliest, displayTz)
    : start;
  const eligible = state.activities.filter(activity => countsForTraining(activity) && Date.parse(activity.startedAt) <= now.getTime());
  const byDay = new Map<string, number>();
  for (const activity of eligible) {
    const key = dayKey(new Date(activity.startedAt), displayTz);
    byDay.set(key, (byDay.get(key) ?? 0) + Math.max(0, activity.movingSec));
  }
  const cumulative = (from: Date, count: number) => {
    let hours = 0;
    return Array.from({ length: count }, (_, i) => {
      const at = shiftZonedDay(from, i, displayTz), id = dayKey(at, displayTz);
      hours += (byDay.get(id) ?? 0) / 3600;
      return { id, date: at.toISOString(), value: hours };
    });
  };
  const activeDays = Array.from({ length: days }, (_, i) => shiftZonedDay(start, i, displayTz))
    .filter(at => dayKey(at, displayTz) >= dayKey(clampedStart, displayTz) && dayKey(at, displayTz) <= dayKey(now, displayTz));
  const elapsed = activeDays.length;
  if (range === "week") {
    const events = (from: Date, until: Date) => {
      let hours = 0;
      const exclusiveEnd = shiftZonedDay(start, 7, displayTz).getTime();
      const rows = [{ id: `start:${from.toISOString()}`, date: from.toISOString(), value: 0 }];
      for (const activity of eligible.filter(a => Date.parse(a.startedAt) >= from.getTime() && Date.parse(a.startedAt) <= until.getTime() && Date.parse(a.startedAt) < exclusiveEnd && a.movingSec > 0)
        .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt) || a.id.localeCompare(b.id))) {
        hours += activity.movingSec / 3600;
        rows.push({ id: activity.id, date: activity.startedAt, value: hours });
      }
      if (until.getTime() >= from.getTime()) {
        rows.push({ id: `end:${until.toISOString()}`, date: until.toISOString(), value: hours });
      }
      return rows;
    };
    const end = shiftZonedDay(start, 7, displayTz);
    const effectiveFrom = new Date(Math.max(start.getTime(), clampedStart.getTime()));
    const chart = openLineModel(
      now < effectiveFrom ? [] : events(effectiveFrom, new Date(Math.min(now.getTime(), end.getTime()))),
      value => value.toFixed(1),
      7,
      { start, end, showTime: true, zeroMin: true },
    );
    return { ...chart, xTicks: Array.from({ length: 7 }, (_, i) => ({
      x: chart.left + (i + 0.5) / 7 * (chart.right - chart.left),
      label: shiftZonedDay(start, i, displayTz).toLocaleDateString("en-US", { weekday: "short", timeZone: displayTz }),
      anchor: "middle" as const,
    })) };
  }
  const windowDays = Math.max(
    2,
    Array.from({ length: days }, (_, i) => shiftAppDay(start, i)).filter(at => dayKey(at) >= dayKey(clampedStart)).length,
  );
  const cumRows: { id: string; date: string; value: number; inspectable?: boolean }[] = cumulative(clampedStart, elapsed);
  if (cumRows.length === 1) {
    cumRows.unshift({ id: `start:${clampedStart.toISOString()}`, date: clampedStart.toISOString(), value: 0, inspectable: false });
  }
  const fourWeeksTimeline = clampedStart.getTime() > start.getTime()
    ? { start: clampedStart, end: shiftAppDay(clampedStart, days), zeroMin: true }
    : undefined;
  return openLineModel(cumRows, value => value.toFixed(1), windowDays, fourWeeksTimeline, true);
}

/** Shared zero-based bars and average, excluding future buckets on both platforms. */
export function benchmarkBars(
  buckets: readonly TrainingBucket[],
  now: Date,
  timeZone: string = APP_TIMEZONE,
) {
  const width = 340, height = 200, top = 28, bottom = 154, left = 32, right = 332;
  const recorded = buckets.filter(bucket => Date.parse(bucket.start) <= now.getTime());
  const average = recorded.length ? recorded.reduce((sum, bucket) => sum + bucket.movingSec, 0) / recorded.length : 0;
  const maxSec = Math.max(3600, ...buckets.map(bucket => bucket.movingSec));
  const topHour = Math.max(1, Math.ceil(maxSec / 3600 * 1.05));
  const max = topHour * 3600;
  const y = (seconds: number) => bottom - seconds / max * (bottom - top);
  const slot = (right - left) / Math.max(1, buckets.length);
  const bars = buckets.map((bucket, i) => ({ ...bucket, x: left + (i + .5) * slot, y: y(bucket.movingSec), future: Date.parse(bucket.start) > now.getTime() }));
  const points = bars.filter(bar => !bar.future).map(bar => ({ id: bar.start, x: bar.x, y: bar.y,
    label: new Date(bar.start).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone }), value: (bar.movingSec / 3600).toFixed(1) }));
  const tickHours = [0, topHour / 2, topHour];
  const formatHour = (h: number) => Number.isInteger(h) ? String(h) : h.toFixed(1);
  return { width, height, top, bottom, left, right, bars, points, barWidth: slot * .62, average, averageY: y(average),
    ticks: tickHours.map(h => ({ label: formatHour(h), y: y(h * 3600) })),
  };
}

function effortScoreAt(
  events: readonly { occurredAt: string; scoreBefore: number; scoreAfter: number }[],
  at: Date,
  fallback: number,
) {
  const prior = events.filter(event => Date.parse(event.occurredAt) < at.getTime()).at(-1);
  if (prior) return prior.scoreAfter;
  const next = events.find(event => Date.parse(event.occurredAt) >= at.getTime());
  return next ? next.scoreBefore : fallback;
}

/** Current score versus the score at the start of the selected Eastern window. */
export function effortScoreComparison(
  state: CompeteState,
  track: "open" | "verified",
  range: EffortHistoryRange,
  now = competeNow(state),
): { current: number; prior: number; pct: number } | null {
  const chartEvents = effortScoreEvents(state, track, now);
  if (!chartEvents.length) return null;
  const start = shiftAppDay(now, -effortScoreLookbackDays(range));
  const inWindow = chartEvents.some(event => Date.parse(event.occurredAt) >= start.getTime());
  if (!inWindow) return null;
  const rating = state.ratings.find(r => r.sport === state.primary);
  const current = (track === "verified" ? rating?.verifiedElo : rating?.openElo) ?? 500;
  const prior = effortScoreAt(chartEvents, start, current);
  if (!Number.isFinite(prior) || prior === 0) return null;
  return { current, prior, pct: ((current - prior) / prior) * 100 };
}

function effortScoreEvents(state: CompeteState, track: "open" | "verified", now: Date) {
  const recorded = (state.effortScoreEvents ?? []).filter(event => event.sport === state.primary && event.track === track
    && Number.isFinite(Date.parse(event.occurredAt)) && Date.parse(event.occurredAt) <= now.getTime()
    && Number.isFinite(event.scoreBefore) && Number.isFinite(event.scoreAfter))
    .slice().sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.id.localeCompare(b.id, "en", { numeric: true }));
  const firstRecordedAt = recorded[0] ? Date.parse(recorded[0].occurredAt) : Infinity;
  const legacy = state.periodResults.filter(result => result.sport === state.primary && result.track === track
    && Number.isFinite(Date.parse(result.periodEnd)) && Date.parse(result.periodEnd) < firstRecordedAt
    && Date.parse(result.periodEnd) <= now.getTime() && result.eloBefore !== result.eloAfter)
    .map(result => ({ id: `settlement:${result.id}`, occurredAt: result.periodEnd, scoreBefore: result.eloBefore, scoreAfter: result.eloAfter }));
  return [...legacy, ...recorded].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.id.localeCompare(b.id, "en", { numeric: true }));
}

/** Score events are committed changes, not estimates from activity distance. */
export function effortScoreLine(state: CompeteState, track: "open" | "verified", range: EffortHistoryRange, now = competeNow(state), createdAt?: string | null) {
  const displayTz = accountTimeZone(state);
  const start = shiftZonedDay(now, -effortScoreLookbackDays(range), displayTz);
  const end = shiftZonedDay(startOfZonedDay(now, displayTz), 1, displayTz);
  const earliest = earliestDataDate(state, now, createdAt);
  const clampedToEarliest = Boolean(earliest && earliest.getTime() > start.getTime());
  const effectiveStart = clampedToEarliest ? earliest! : start;
  const timelineStart = clampedToEarliest ? startOfZonedDay(effectiveStart, displayTz) : start;
  const timelineEnd = clampedToEarliest
    ? shiftZonedDay(timelineStart, effortScoreLookbackDays(range) + 1, displayTz)
    : end;
  const events = effortScoreEvents(state, track, now);
  const rows: { id: string; date: string; value: number; breakBefore?: boolean; inspectable?: boolean }[] = [];
  const rating = state.ratings.find(r => r.sport === state.primary);
  const current = (track === "verified" ? rating?.verifiedElo : rating?.openElo) ?? 500;
  const eventsInWindow = events.filter(event => Date.parse(event.occurredAt) >= effectiveStart.getTime());
  const eventDays = new Set(eventsInWindow.map(event => dayKey(new Date(event.occurredAt), displayTz)));
  const todayKey = dayKey(now, displayTz);
  const startDay = startOfZonedDay(effectiveStart, displayTz);
  const todayStart = startOfZonedDay(now, displayTz);
  type TimelineRow = { id: string; date: string; value: number; breakBefore?: boolean; inspectable?: boolean };
  const dailyRows: TimelineRow[] = [];
  for (let d = 0; ; d += 1) {
    const day = shiftZonedDay(startDay, d, displayTz);
    if (day.getTime() >= todayStart.getTime()) break;
    const key = dayKey(day, displayTz);
    if (key === todayKey || eventDays.has(key)) continue;
    const at = day.getTime() < effectiveStart.getTime() ? effectiveStart : day;
    dailyRows.push({
      id: `day:${key}`,
      date: at.toISOString(),
      value: effortScoreAt(events, at, current),
    });
  }
  const timeline = [
    ...dailyRows.map(row => ({ ...row, kind: "day" as const })),
    ...eventsInWindow.map(event => ({
      id: event.id,
      date: event.occurredAt,
      value: event.scoreAfter,
      scoreBefore: event.scoreBefore,
      kind: "event" as const,
    })),
  ].sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || (a.kind === "day" ? -1 : 1));
  if (!timeline.length || Date.parse(timeline[0]!.date) > effectiveStart.getTime()) {
    rows.push({
      id: "baseline",
      date: effectiveStart.toISOString(),
      value: effortScoreAt(events, effectiveStart, current),
      inspectable: false,
    });
  }
  for (const item of timeline) {
    if (item.kind === "event") {
      if (!rows.length || rows.at(-1)!.value !== item.scoreBefore) {
        rows.push({
          id: `before:${item.id}`,
          date: new Date(Math.max(effectiveStart.getTime(), Date.parse(item.date) - 1)).toISOString(),
          value: item.scoreBefore,
          breakBefore: true,
          inspectable: false,
        });
      }
      rows.push({ id: item.id, date: item.date, value: item.value });
    } else {
      rows.push({ id: item.id, date: item.date, value: item.value });
    }
  }
  rows.push({ id: "current", date: now.toISOString(), value: current, breakBefore: !!rows.length && rows.at(-1)!.value !== current });
  const chart = openLineModel(rows, value => String(Math.round(value)), 7, { start: timelineStart, end: timelineEnd, showTime: range === "week", step: false, timeZone: displayTz });
  // Unknown award times remain gaps in the data. Dashed bridges connect the
  // known readings visually without asserting an award time in that interval.
  return { ...chart, bridges: chart.segments.slice(1).map((line, index) =>
    `${chart.segments[index]!.split(" ").at(-1)} ${line.split(" ")[0]}`) };

}

export type BenchmarkBarsModel = ReturnType<typeof benchmarkBars>;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function parsePolyline(raw: string): { x: number; y: number }[] {
  if (!raw.trim()) return [];
  const points: { x: number; y: number }[] = [];
  for (const token of raw.trim().split(/\s+/)) {
    const [xs, ys] = token.split(",");
    const x = Number(xs);
    const y = Number(ys);
    if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y });
  }
  return points;
}

function sampleXY(pts: readonly { x: number; y: number }[], u: number): { x: number; y: number } {
  if (pts.length === 1) return pts[0]!;
  const pos = Math.max(0, Math.min(1, u)) * (pts.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(pts.length - 1, Math.ceil(pos));
  const frac = pos - lo;
  return { x: lerp(pts[lo]!.x, pts[hi]!.x, frac), y: lerp(pts[lo]!.y, pts[hi]!.y, frac) };
}

function morphPolyline(fromRaw: string, toRaw: string, t: number): string {
  const fromPts = parsePolyline(fromRaw);
  const toPts = parsePolyline(toRaw);
  if (!fromPts.length && !toPts.length) return "";
  if (!fromPts.length || !toPts.length) return t >= 0.5 ? toRaw : fromRaw;
  const count = fromPts.length === 2 && toPts.length === 2 ? 2 : Math.max(24, fromPts.length, toPts.length);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const u = count === 1 ? 0 : i / (count - 1);
    const a = sampleXY(fromPts, u);
    const b = sampleXY(toPts, u);
    out.push(`${lerp(a.x, b.x, t).toFixed(1)},${lerp(a.y, b.y, t).toFixed(1)}`);
  }
  return out.join(" ");
}

function morphFormattedNumber(fromVal: string, toVal: string, t: number): string {
  const a = Number(fromVal.replace(/,/g, ""));
  const b = Number(toVal.replace(/,/g, ""));
  if (!Number.isFinite(a) || !Number.isFinite(b) || !fromVal.trim() || !toVal.trim()) {
    return t >= 0.5 ? toVal : fromVal;
  }
  const decimals = toVal.includes(".") ? toVal.split(".")[1]!.length : 0;
  const val = lerp(a, b, t);
  if (toVal.includes(",")) {
    return val.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return decimals > 0 ? val.toFixed(decimals) : String(Math.round(val));
}

/** Smoothly morph line-chart geometry and headline reading when switching ranges. */
export function interpolateOpenLineModel(
  from: OpenLineModel,
  to: OpenLineModel,
  t: number,
): OpenLineModel {
  const u = Math.max(0, Math.min(1, t));
  if (u <= 0) return from;
  if (u >= 1) return to;
  const fromFallback = from.segments.at(-1) ?? from.line;
  const segments = to.segments.map((seg, i) =>
    morphPolyline(from.segments[i] ?? fromFallback, seg, u),
  );
  const bridges = to.bridges?.map((bridge, i) =>
    morphPolyline(from.bridges?.[i] ?? from.bridges?.at(-1) ?? bridge, bridge, u),
  );
  const fromEnd = from.points.at(-1);
  const toEnd = to.points.at(-1);
  const points =
    fromEnd && toEnd && to.points.length > 0
      ? [
          ...to.points.slice(0, -1),
          { ...toEnd, x: lerp(fromEnd.x, toEnd.x, u), y: lerp(fromEnd.y, toEnd.y, u) },
        ]
      : to.points;
  return {
    ...to,
    segments,
    ...(bridges ? { bridges } : {}),
    line: morphPolyline(from.line, to.line, u),
    trendLine: morphPolyline(from.trendLine, to.trendLine, u),
    value: morphFormattedNumber(from.value, to.value, u),
    points,
    xTicks: u < 0.35 ? from.xTicks : to.xTicks,
    yTicks: to.yTicks.map((tick, i) => ({
      ...tick,
      y: lerp(from.yTicks[i]?.y ?? tick.y, tick.y, u),
    })),
  };
}

/** Smoothly morph benchmark bar heights, widths, average line, and axis ticks between ranges. */
export function interpolateBenchmarkBars(
  from: BenchmarkBarsModel,
  to: BenchmarkBarsModel,
  t: number,
): BenchmarkBarsModel {
  const u = Math.max(0, Math.min(1, t));
  if (u <= 0) return from;
  if (u >= 1) return to;
  const bars = to.bars.map((bar, i) => {
    if (!from.bars.length) return bar;
    const norm = to.bars.length > 1 ? i / (to.bars.length - 1) : 0.5;
    const sampled = sampleXY(from.bars, norm);
    return {
      ...bar,
      x: lerp(sampled.x, bar.x, u),
      y: lerp(sampled.y, bar.y, u),
    };
  });
  return {
    ...to,
    bars,
    barWidth: lerp(from.barWidth, to.barWidth, u),
    average: lerp(from.average, to.average, u),
    averageY: lerp(from.averageY, to.averageY, u),
    ticks: to.ticks.map((tick, i) => ({
      ...tick,
      y: lerp(from.ticks[i]?.y ?? tick.y, tick.y, u),
    })),
  };
}
