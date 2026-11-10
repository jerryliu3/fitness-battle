import { ordinalPlace } from "./arena-view";
import { competitionPlace } from "./competition-place";
import { activityEffort } from "./compete/effort";
import { competeNow, weeklyBoard } from "./compete/engine";
import { buildSleepView, collapseNights, sleepContest } from "./compete/health";
import { countsOnTrack } from "./compete/ledger";
import {
  clamp,
  dayKey,
  sportById,
  unitInterval,
  type CompeteState,
  type ScoreTrack,
  type SportId,
} from "./compete/sports";
import { initialsFromName, selfLaneLabel } from "./compete/track";
import { findSynthetic, syntheticVolumeInWindow } from "./matching/synthetic-bank";
import { APP_TIMEZONE, endOfZonedDay, shiftAppDay } from "./period";
import { competePeriodWindow } from "./phone-views";

export type FieldViewDimension = "2d" | "3d" | "4d" | "graph";

export interface CompeteTimeSeriesVertex {
  t: number;
  value: number;
}

export interface CompeteTimeSeriesOvertake {
  id: string;
  t: number;
  value: number;
  x: number;
  y: number;
  passedId: string;
  passedName: string;
}

export interface CompeteTimeSeriesAthlete {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  avatarUrl?: string | null;
  you: boolean;
  selected: boolean;
  vertices: CompeteTimeSeriesVertex[];
  polyline: string;
  currentValue: number;
  valueAtCursor: number;
  formattedValueAtCursor: string;
  placeAtCursor: number;
  cursorX: number;
  cursorY: number;
}

export interface CompeteTimeSeriesDayTick {
  index: number;
  label: string;
  x: number;
  future: boolean;
  active: boolean;
}

export interface CompeteTimeSeriesYTick {
  value: number;
  label: string;
  y: number;
}

export interface CompeteTimeSeriesModel {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  unit: string;
  yMax: number;
  yTicks: CompeteTimeSeriesYTick[];
  dayTicks: CompeteTimeSeriesDayTick[];
  nowFraction: number;
  nowX: number;
  cursorFraction: number;
  cursorX: number;
  isScrubbing: boolean;
  historyAvailable: boolean;
  timeLabel: string;
  cursorTimeLabel: string;
  latestTimeLabel: string;
  athletes: CompeteTimeSeriesAthlete[];
  selectedAthlete: CompeteTimeSeriesAthlete;
  overtakes: CompeteTimeSeriesOvertake[];
  overtakeCount: number;
  gapLabel: string;
  overtakeLabel: string;
  placeLabel: string;
  tipPill: {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
  };
}

export interface CompeteTimeSeriesOptions {
  height?: number;
  hiddenIds?: readonly string[];
  selectedAthleteId?: string | null;
  scrubFraction?: number | null;
}

const CHART_WIDTH = 342;
const CHART_HEIGHT = 204;
const PLOT_LEFT = 34;
const PLOT_RIGHT = 296;
const PLOT_TOP = 20;

function firstNameOf(name: string, you: boolean): string {
  if (you) return selfLaneLabel(name);
  const first = name.trim().split(/\s+/)[0];
  return first || name;
}

function formatMetricValue(value: number, unit: string): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  if (unit === "km" || unit === "mi") {
    return safe.toFixed(1);
  }
  return Math.round(safe).toLocaleString("en-US");
}

function niceAxisCeiling(peak: number, unit: string): number {
  if (unit === "score") return 100;
  const safePeak = Number.isFinite(peak) ? Math.max(0, peak) : 0;
  if (unit === "pts") {
    const minCeil = 40;
    const padded = Math.max(minCeil, safePeak * 1.15);
    const step = padded <= 100 ? 20 : padded <= 300 ? 50 : 100;
    return Math.ceil(padded / step) * step;
  }
  const minCeil = 6;
  const padded = Math.max(minCeil, safePeak * 1.15);
  const step = padded <= 12 ? 2 : padded <= 30 ? 5 : 10;
  return Math.ceil(padded / step) * step;
}

export function interpolateTimeSeriesAt(
  vertices: readonly CompeteTimeSeriesVertex[],
  t: number,
): number {
  if (!vertices.length) return 0;
  if (t < vertices[0]!.t) return vertices[0]!.value;
  // Right-continuous at activity timestamps, including multiple sessions at once.
  for (let i = vertices.length - 1; i >= 0; i--) {
    const a = vertices[i]!;
    if (t < a.t) continue;
    const b = vertices[i + 1];
    return b ? a.value + (b.value - a.value) * (t - a.t) / (b.t - a.t) : a.value;
  }
  return vertices[0]!.value;
}

function clipVerticesToCursor(
  vertices: readonly CompeteTimeSeriesVertex[],
  limitT: number,
): CompeteTimeSeriesVertex[] {
  if (vertices.length === 0) return [{ t: 0, value: 0 }];
  const clipped: CompeteTimeSeriesVertex[] = [];
  for (const v of vertices) {
    if (v.t <= limitT + 1e-7) {
      clipped.push({ t: Math.min(v.t, limitT), value: v.value });
    } else {
      break;
    }
  }
  const last = clipped[clipped.length - 1];
  if (!last || Math.abs(last.t - limitT) > 1e-6) {
    clipped.push({ t: limitT, value: interpolateTimeSeriesAt(vertices, limitT) });
  }
  return clipped;
}

function computeSelectedOvertakes(
  selected: { id: string; vertices: readonly CompeteTimeSeriesVertex[] },
  others: readonly { id: string; firstName: string; vertices: readonly CompeteTimeSeriesVertex[] }[],
  cursorFraction: number,
  xForT: (t: number) => number,
  yForValue: (v: number) => number,
): CompeteTimeSeriesOvertake[] {
  if (cursorFraction <= 0) return [];
  const raw: CompeteTimeSeriesOvertake[] = [];

  for (const other of others) {
    if (other.id === selected.id) continue;
    const jumpTimes = new Set([selected.vertices, other.vertices].flatMap(points =>
      points.filter((v, i) => i > 0 && points[i - 1]!.t === v.t && points[i - 1]!.value !== v.value).map(v => v.t)));
    const tSet = new Set<number>([0, cursorFraction]);
    for (const v of selected.vertices) {
      if (v.t > 0 && v.t < cursorFraction) tSet.add(v.t);
    }
    for (const v of other.vertices) {
      if (v.t > 0 && v.t < cursorFraction) tSet.add(v.t);
    }
    const stops = [...tSet].sort((a, b) => a - b);
    let wasBehind = false;

    for (let i = 0; i < stops.length - 1; i += 1) {
      const tA = stops[i]!;
      const tB = stops[i + 1]!;
      if (tB - tA <= 1e-8) continue;

      const sA = interpolateTimeSeriesAt(selected.vertices, tA);
      const sB = interpolateTimeSeriesAt(selected.vertices, tB);
      const oA = interpolateTimeSeriesAt(other.vertices, tA);
      const oB = interpolateTimeSeriesAt(other.vertices, tB);
      const dA = sA - oA;
      const dB = sB - oB;

      const jump = jumpTimes.has(tB);
      const before = tB - Math.min(1e-8, (tB - tA) / 2);
      if (jump && interpolateTimeSeriesAt(selected.vertices, before) < interpolateTimeSeriesAt(other.vertices, before) - 1e-4) wasBehind = true;
      if (dA < -1e-4) {
        wasBehind = true;
      }

      if (wasBehind && dB > 1e-4) {
        let tCross = tA;
        let valCross = sA;
        if (dA < 0 && dB - dA > 1e-9) {
          const alpha = clamp(0, 1, -dA / (dB - dA));
          tCross = tA + alpha * (tB - tA);
          valCross = sA + alpha * (sB - sA);
        }
        if (jump) { tCross = tB; valCross = sB; }
        if (valCross > 0.05 && tCross <= cursorFraction + 1e-6) {
          raw.push({
            id: `${selected.id}:pass:${other.id}:${tCross.toFixed(4)}`,
            t: tCross,
            value: valCross,
            x: xForT(tCross),
            y: yForValue(valCross),
            passedId: other.id,
            passedName: other.firstName,
          });
        }
        wasBehind = false;
      }
    }
  }

  raw.sort((a, b) => a.t - b.t || a.passedId.localeCompare(b.passedId));
  return raw;
}

function finalizeTimeSeriesModel(input: {
  periodStart: Date;
  periodEnd: Date;
  now: Date;
  unit: string;
  rawAthletes: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    you: boolean;
    currentValue: number;
    vertices: CompeteTimeSeriesVertex[];
    historyAvailable?: boolean;
  }[];
  options?: CompeteTimeSeriesOptions;
}): CompeteTimeSeriesModel {
  const chartHeight = Number.isFinite(input.options?.height) ? Math.max(CHART_HEIGHT, input.options!.height!) : CHART_HEIGHT;
  const plotBottom = chartHeight - 38;
  const startMs = input.periodStart.getTime();
  const endMs = input.periodEnd.getTime();
  const spanMs = Math.max(1, endMs - startMs);
  const clampedNowMs = clamp(startMs, endMs, input.now.getTime());
  const nowFraction = clamp(0, 1, (clampedNowMs - startMs) / spanMs);
  const historyAvailable = input.rawAthletes.every(athlete => athlete.historyAvailable !== false);
  const isScrubbing = historyAvailable &&
    input.options?.scrubFraction != null &&
    Number.isFinite(input.options.scrubFraction);
  const cursorFraction = isScrubbing
    ? clamp(0, nowFraction, input.options!.scrubFraction!)
    : nowFraction;

  const peak = Math.max(
    0,
    ...input.rawAthletes.flatMap((a) => [
      a.currentValue,
      ...a.vertices.map((v) => v.value),
    ]),
  );
  const yMax = niceAxisCeiling(peak, input.unit);

  const xForT = (t: number) =>
    PLOT_LEFT + clamp(0, 1, t) * (PLOT_RIGHT - PLOT_LEFT);
  const yForValue = (v: number) =>
    plotBottom - (clamp(0, yMax, v) / Math.max(1, yMax)) * (plotBottom - PLOT_TOP);

  const nowX = xForT(nowFraction);
  const cursorX = xForT(cursorFraction);

  const valuesAtCursor = input.rawAthletes.map((a) =>
    interpolateTimeSeriesAt(a.vertices, cursorFraction),
  );

  const requestedId = input.options?.selectedAthleteId;
  const fallbackYou =
    input.rawAthletes.find((a) => a.you) ?? input.rawAthletes[0]!;
  const resolvedSelectedId =
    requestedId && input.rawAthletes.some((a) => a.id === requestedId)
      ? requestedId
      : fallbackYou.id;

  const athletes: CompeteTimeSeriesAthlete[] = input.rawAthletes
    .map((a, idx) => {
      const valueAtCursor = valuesAtCursor[idx]!;
      const placeAtCursor = competitionPlace(valuesAtCursor, valueAtCursor);
      const clipped = clipVerticesToCursor(a.vertices, nowFraction);
      const polyline = clipped
        .map((v) => `${xForT(v.t).toFixed(1)},${yForValue(v.value).toFixed(1)}`)
        .join(" ");
      return {
        id: a.id,
        name: a.name,
        firstName: firstNameOf(a.name, a.you),
        initials: a.you ? "YOU" : initialsFromName(a.name),
        avatarUrl: a.avatarUrl,
        you: a.you,
        selected: a.id === resolvedSelectedId,
        vertices: a.vertices,
        polyline,
        currentValue: a.currentValue,
        valueAtCursor,
        formattedValueAtCursor: formatMetricValue(valueAtCursor, input.unit),
        placeAtCursor,
        cursorX,
        cursorY: yForValue(valueAtCursor),
      };
    })
    .sort(
      (a, b) =>
        a.placeAtCursor - b.placeAtCursor ||
        b.valueAtCursor - a.valueAtCursor ||
        a.name.localeCompare(b.name),
    );

  const selectedAthlete =
    athletes.find((a) => a.selected) ??
    athletes.find((a) => a.you) ??
    athletes[0]!;

  const overtakes = historyAvailable ? computeSelectedOvertakes(
    selectedAthlete,
    athletes.filter((a) => a.id !== selectedAthlete.id),
    cursorFraction,
    xForT,
    yForValue,
  ) : [];
  const overtakeCount = overtakes.length;

  const youAthlete = athletes.find((a) => a.you) ?? selectedAthlete;
  let gapLabel: string;
  if (selectedAthlete.you) {
    const aheadCandidates = athletes
      .filter((a) => !a.you && a.valueAtCursor > selectedAthlete.valueAtCursor + 1e-5)
      .sort((a, b) => a.valueAtCursor - b.valueAtCursor);
    const closestAhead = aheadCandidates[0];
    if (!closestAhead) {
      gapLabel = "Leading the field";
    } else {
      const gap = closestAhead.valueAtCursor - selectedAthlete.valueAtCursor;
      gapLabel = `${formatMetricValue(gap, input.unit)} ${input.unit} to #${closestAhead.placeAtCursor} ${closestAhead.firstName}`;
    }
  } else {
    const delta = selectedAthlete.valueAtCursor - youAthlete.valueAtCursor;
    if (Math.abs(delta) < 0.05) {
      gapLabel = `Tied with ${youAthlete.firstName}`;
    } else {
      const sign = delta > 0 ? "+" : "−";
      gapLabel = `${sign}${formatMetricValue(Math.abs(delta), input.unit)} ${input.unit} vs ${youAthlete.firstName}`;
    }
  }

  const overtakeLabel = `${overtakeCount} ${overtakeCount === 1 ? "overtake" : "overtakes"} so far`;
  const placeLabel = `${ordinalPlace(selectedAthlete.placeAtCursor)} place`;

  const cursorDate = new Date(startMs + cursorFraction * spanMs);
  const datePart = cursorDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
  const subjectPart = `${selectedAthlete.firstName}’s trajectory`;
  const timeLabel = `${datePart} · ${isScrubbing ? "Inspected" : "Live"} · ${subjectPart}`;

  const nowDayIndex = Math.min(6, Math.floor(nowFraction * 6.999));
  const activeDayIndex = Math.min(6, Math.floor(cursorFraction * 6.999));
  const dayTicks: CompeteTimeSeriesDayTick[] = Array.from({ length: 7 }, (_, i) => {
    const dayDate = shiftAppDay(input.periodStart, i);
    const label = dayDate.toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: APP_TIMEZONE,
    });
    return {
      index: i,
      label,
      x: PLOT_LEFT + (i / 6) * (PLOT_RIGHT - PLOT_LEFT),
      future: i > nowDayIndex,
      active: i === activeDayIndex,
    };
  });

  const yTicks: CompeteTimeSeriesYTick[] = [0, yMax / 2, yMax].map((val) => ({
    value: val,
    label: formatMetricValue(val, input.unit),
    y: yForValue(val),
  }));

  const pillText = `#${selectedAthlete.placeAtCursor} ${selectedAthlete.you ? "YOU" : selectedAthlete.initials}`;
  const pillWidth = Math.max(46, pillText.length * 6.6 + 14);
  const pillHeight = 20;
  const pillX = clamp(
    PLOT_LEFT + 2,
    CHART_WIDTH - pillWidth - 4,
    cursorX + 8,
  );
  const pillY = clamp(
    PLOT_TOP,
    plotBottom - pillHeight,
    selectedAthlete.cursorY - pillHeight / 2,
  );

  return {
    width: CHART_WIDTH,
    height: chartHeight,
    left: PLOT_LEFT,
    right: PLOT_RIGHT,
    top: PLOT_TOP,
    bottom: plotBottom,
    unit: input.unit,
    yMax,
    yTicks,
    dayTicks,
    nowFraction,
    nowX,
    cursorFraction,
    cursorX,
    isScrubbing,
    historyAvailable,
    timeLabel,
    cursorTimeLabel: cursorDate.toLocaleString("en-US", { timeZone: APP_TIMEZONE, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    latestTimeLabel: new Date(startMs + nowFraction * spanMs).toLocaleString("en-US", { timeZone: APP_TIMEZONE, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    athletes,
    selectedAthlete,
    overtakes,
    overtakeCount,
    gapLabel,
    overtakeLabel,
    placeLabel,
    tipPill: {
      x: pillX,
      y: pillY,
      width: pillWidth,
      height: pillHeight,
      text: pillText,
    },
  };
}

function buildYouVertices(
  state: CompeteState,
  sport: SportId,
  track: ScoreTrack,
  periodStart: Date,
  periodEnd: Date,
  clampedNowMs: number,
  nowFraction: number,
  liveValue: number,
): CompeteTimeSeriesVertex[] {
  const spec = sportById(sport);
  const divisor = state.units === "metric" ? 1000 : 1609.344;
  const startMs = periodStart.getTime();
  const endMs = periodEnd.getTime();
  const spanMs = Math.max(1, endMs - startMs);
  const enrollment = state.enrollments.find((e) => e.sport === sport);
  const sourceActivities = enrollment?.scoringActivities ?? state.activities;

  const eligible = sourceActivities
    .filter((a) => {
      if (a.sport !== sport || !countsOnTrack(a, track)) return false;
      const at = Date.parse(a.startedAt);
      return Number.isFinite(at) && at >= startMs && at <= clampedNowMs && at < endMs;
    })
    .sort(
      (a, b) =>
        Date.parse(a.startedAt) - Date.parse(b.startedAt) ||
        a.id.localeCompare(b.id),
    );

  const vertices: CompeteTimeSeriesVertex[] = [{ t: 0, value: 0 }];
  let cumulative = 0;

  for (const act of eligible) {
    const delta = spec.gps ? act.distanceM / divisor : activityEffort(act);
    if (delta <= 0) continue;
    const t = clamp(0, nowFraction, (Date.parse(act.startedAt) - startMs) / spanMs);
    vertices.push({ t, value: cumulative });
    cumulative += delta;
    vertices.push({ t, value: cumulative });
  }

  if (nowFraction > 0) {
    const last = vertices[vertices.length - 1]!;
    if (Math.abs(nowFraction - last.t) <= 1e-5) {
      last.value = liveValue;
    } else {
      vertices.push({ t: nowFraction, value: liveValue });
    }
  }

  return vertices;
}

function buildCompetitorVertices(
  athleteId: string,
  sport: SportId,
  track: ScoreTrack,
  units: CompeteState["units"],
  periodStart: Date,
  periodEnd: Date,
  clampedNowMs: number,
  nowFraction: number,
  liveValue: number,
): CompeteTimeSeriesVertex[] {
  if (nowFraction <= 0 || liveValue <= 0) {
    return nowFraction > 0
      ? [
          { t: 0, value: 0 },
          { t: nowFraction, value: 0 },
        ]
      : [{ t: 0, value: 0 }];
  }

  const spec = sportById(sport);
  const divisor = units === "metric" ? 1000 : 1609.344;
  const startMs = periodStart.getTime();
  const endMs = periodEnd.getTime();
  const spanMs = Math.max(1, endMs - startMs);
  const synthetic = findSynthetic(sport, athleteId);

  if (!synthetic) return [{ t: nowFraction, value: liveValue }];
  const rawPoints: CompeteTimeSeriesVertex[] = [{ t: 0, value: 0 }];
  let cursor = new Date(startMs);
  while (cursor.getTime() < clampedNowMs) {
    const dayEnd = endOfZonedDay(cursor);
    const cutoffMs = Math.min(clampedNowMs, dayEnd.getTime());
    const t = clamp(0, nowFraction, (cutoffMs - startMs) / spanMs);
    const vol = syntheticVolumeInWindow(synthetic, sport, periodStart, periodEnd, track, new Date(cutoffMs), spec.gps);
    rawPoints.push({ t, value: spec.gps ? vol.distanceM / divisor : vol.effort });
    cursor = dayEnd;
  }

  const lastRaw = rawPoints[rawPoints.length - 1]!;
  if (lastRaw.value > 1e-6) {
    const scale = liveValue / lastRaw.value;
    for (let i = 1; i < rawPoints.length; i += 1) {
      rawPoints[i]!.value = rawPoints[i]!.value * scale;
    }
    lastRaw.t = nowFraction;
    lastRaw.value = liveValue;
    return rawPoints;
  }

  return [
    { t: 0, value: 0 },
    { t: nowFraction, value: liveValue },
  ];
}

export function buildCompeteTimeSeriesModel(
  state: CompeteState,
  sport: SportId = state.primary,
  track: ScoreTrack = "open",
  now: Date = competeNow(state),
  options?: CompeteTimeSeriesOptions,
): CompeteTimeSeriesModel {
  const spec = sportById(sport);
  const unit = spec.gps ? (state.units === "metric" ? "km" : "mi") : "pts";
  const period = competePeriodWindow(state, now, sport);
  const startMs = period.startsAt.getTime();
  const endMs = period.endsAt.getTime();
  const spanMs = Math.max(1, endMs - startMs);
  const clampedNowMs = clamp(startMs, endMs, now.getTime());
  const nowFraction = clamp(0, 1, (clampedNowMs - startMs) / spanMs);

  const hidden = new Set(options?.hiddenIds ?? []);
  const board = weeklyBoard(state, sport, track, now).filter(
    (row) => !hidden.has(row.id),
  );
  const enrollment = state.enrollments.find((item) => item.sport === sport);
  const divisor = state.units === "metric" ? 1000 : 1609.344;

  const rows =
    board.length > 0
      ? board
      : [
          {
            id: "you",
            name: state.name,
            elo: 1000,
            effort: 0,
            distanceM: 0,
            movingSec: 0,
            you: true,
            place: 1,
          },
        ];

  const rawAthletes = rows.map((row) => {
    const liveValue = spec.gps ? row.distanceM / divisor : row.effort;
    const vertices = row.you
      ? buildYouVertices(
          state,
          sport,
          track,
          period.startsAt,
          period.endsAt,
          clampedNowMs,
          nowFraction,
          liveValue,
        )
      : buildCompetitorVertices(
          row.id,
          sport,
          track,
          state.units,
          period.startsAt,
          period.endsAt,
          clampedNowMs,
          nowFraction,
          liveValue,
        );
    const avatarUrl = row.you
      ? state.avatarUrl
      : enrollment?.fieldBoard?.members.find((m) => m.id === row.id)?.avatarUrl;
    return {
      id: row.id,
      name: row.you ? state.name : row.name,
      avatarUrl,
      you: row.you,
      currentValue: liveValue,
      historyAvailable: row.you || Boolean(findSynthetic(sport, row.id)),
      vertices,
    };
  });

  return finalizeTimeSeriesModel({
    periodStart: period.startsAt,
    periodEnd: period.endsAt,
    now,
    unit,
    rawAthletes,
    options,
  });
}

export function buildSleepTimeSeriesModel(
  state: CompeteState,
  now: Date = competeNow(state),
  options?: CompeteTimeSeriesOptions,
): CompeteTimeSeriesModel {
  const rating =
    state.healthRatings.find((r) => r.metric === "sleep") ?? {
      metric: "sleep" as const,
      elo: 1000,
      optedIn: true,
      lockElo: 1000,
      lockPeriod: state.clock.periodStart,
      autoEnrollNext: true,
    };
  const view = buildSleepView({
    name: state.name,
    nights: state.sleepNights,
    rating: { ...rating, optedIn: true },
    results: state.healthResults,
    now,
  });

  const startMs = view.periodStart.getTime();
  const endMs = view.periodEnd.getTime();
  const spanMs = Math.max(1, endMs - startMs);
  const clampedNowMs = clamp(startMs, endMs, now.getTime());
  const nowFraction = clamp(0, 1, (clampedNowMs - startMs) / spanMs);
  const hidden = new Set(options?.hiddenIds ?? []);
  const collapsed = collapseNights(state.sleepNights);

  const rows =
    view.rows.filter((r) => !hidden.has(r.id)).length > 0
      ? view.rows.filter((r) => !hidden.has(r.id))
      : [
          {
            id: "you",
            name: state.name,
            elo: rating.elo,
            score: view.contestScore,
            mean: view.mean,
            lastNight: view.lastNight?.score ?? null,
            nights: view.nightsLogged,
            you: true,
            place: 1,
          },
        ];

  const rawAthletes = rows.map((row) => {
    const liveValue = row.score;
    const vertices: CompeteTimeSeriesVertex[] = [{ t: 0, value: 0 }];
    if (nowFraction > 0) {
      let cursor = new Date(startMs);
      let dayIdx = 0;
      while (cursor.getTime() < clampedNowMs) {
        const dayEnd = endOfZonedDay(cursor);
        const cutoffMs = Math.min(clampedNowMs, dayEnd.getTime());
        const t = clamp(0, nowFraction, (cutoffMs - startMs) / spanMs);
        if (row.you) {
          const contest = sleepContest(
            collapsed,
            view.periodStart,
            view.periodEnd,
            new Date(cutoffMs),
          );
          vertices.push({ t, value: contest.score });
        } else {
          const jitter =
            (unitInterval(`${row.id}:sleep-day:${dayIdx}`) - 0.5) * 8;
          const ramp = Math.min(1, (dayIdx + 1) / Math.max(1, view.elapsedNights));
          const val = clamp(0, 100, liveValue * (0.86 + 0.14 * ramp) + jitter * (1 - ramp * 0.5));
          vertices.push({ t, value: val });
        }
        cursor = dayEnd;
        dayIdx += 1;
      }
      const last = vertices[vertices.length - 1]!;
      last.t = nowFraction;
      last.value = liveValue;
    }

    return {
      id: row.id,
      name: row.you ? state.name : row.name,
      avatarUrl: row.you ? state.avatarUrl : undefined,
      you: row.you,
      currentValue: liveValue,
      vertices,
    };
  });

  return finalizeTimeSeriesModel({
    periodStart: view.periodStart,
    periodEnd: view.periodEnd,
    now,
    unit: "score",
    rawAthletes,
    options,
  });
}

/** Fit the last day and every current position inside a labeled plot. */
export function competeChartPreview(model: CompeteTimeSeriesModel) {
  const width = 320, height = 300, left = 42, right = 296, top = 30, bottom = 258;
  const end = model.nowX;
  const start = Math.max(model.left, end - (model.right - model.left) / 7);
  const span = Math.max(1, end - start);
  const parse = (line: string) => line.trim().split(/\s+/).filter(Boolean).map(pair => pair.split(",").map(Number) as [number, number]);
  const x = (value: number) => left + (value - start) / span * (right - left);
  const y = (value: number) => top + (value - model.top) / (model.bottom - model.top) * (bottom - top);
  return { width, height, left, right, top, bottom,
    yTicks: model.yTicks.map(tick => ({ ...tick, y: y(tick.y) })),
    xTicks: [{ x: left, label: model.nowFraction > 1 / 7 ? "24h ago" : "Start" }, { x: right, label: "Now" }],
    athletes: [...model.athletes].sort((a, b) => Number(a.selected) - Number(b.selected)).map(athlete => {
      const points = parse(athlete.polyline);
      const first = points.findIndex(([px]) => px >= start);
      const visible = points.slice(Math.max(0, first)).filter(([px]) => px <= end);
      if (first > 0 && visible.length) {
        const [ax, ay] = points[first - 1]!, [bx, by] = visible[0]!;
        visible.unshift([start, ay + (by - ay) * (start - ax) / Math.max(.001, bx - ax)]);
      }
      return { id: athlete.id, selected: athlete.selected,
        points: visible.map(([px, py]) => `${x(px)},${y(py)}`).join(" "),
        x: x(athlete.cursorX), y: y(athlete.cursorY),
      };
    }),
  };
}
