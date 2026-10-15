/**
 * View models for the phone tabs. Plain data — no React, DOM, or native imports.
 * The checkpoint route and lane values stay here so Expo and the web column match.
 */
import { competeNow, formatEffort, weeklyBoard } from "./compete/engine";
import { resolvePastSelfGhost, ghostHasVolume } from "./compete/ghost";
import { formatEloDelta, formatPlace } from "./compete/history";
import { countsOnTrack } from "./compete/ledger";
import { sportById, type Activity, type CompeteState, type SportId } from "./compete/sports";
import { suggestionForState, type DaySuggestion } from "./compete/suggestion";
import {
  activityCheckpoints,
  syntheticCheckpoints,
  type CheckpointSeries,
} from "./compete/track";
import { currentPeriodBounds } from "./period";

export const CHECKPOINT_FRAME = { width: 320, height: 570 } as const;

/** Winding route from the Today checkpoint study. */
export const CHECKPOINT_PATH =
  "M 105 42 C 105 85, 225 75, 225 115 S 148 158, 148 235 S 75 396, 75 434 S 236 450, 236 488 S 155 514, 155 543";

export interface CheckpointAnchor {
  /** Center X as a fraction of the frame width. */
  cx: number;
  top: number;
}

export const CHECKPOINT_ANCHORS = {
  past: [
    { cx: 0.328, top: 10 },
    { cx: 0.703, top: 82 },
  ],
  today: { cx: 0.463, top: 207 },
  future: [
    { cx: 0.234, top: 406 },
    { cx: 0.738, top: 460 },
    { cx: 0.484, top: 515 },
  ],
} as const satisfies {
  past: readonly CheckpointAnchor[];
  today: CheckpointAnchor;
  future: readonly CheckpointAnchor[];
};

export type CheckpointRole = "past" | "today" | "future";

export interface CheckpointDisc {
  id: string;
  role: CheckpointRole;
  cx: number;
  top: number;
  activityId: string | null;
  volume: string | null;
  title: string;
  detail: string;
  accessibilityLabel: string;
}

export interface TodayRoute {
  suggestion: DaySuggestion;
  discs: CheckpointDisc[];
  path: string;
  frame: { width: number; height: number };
}

export interface ArenaLane {
  id: string;
  name: string;
  you: boolean;
  ghost: boolean;
  values: [number, number, number];
}

export interface ArenaModel {
  sportId: SportId;
  sportName: string;
  unit: "km" | "pts";
  labels: [string, string, string];
  lanes: ArenaLane[];
  optedIn: boolean;
}

export interface AwardCardModel {
  id: string;
  sportName: string;
  weekLabel: string;
  place: string;
  effort: string;
  delta: string;
  headline: string;
}

function periodWindow(state: CompeteState, now: Date) {
  return currentPeriodBounds(state.clock.kind, now);
}

function countedInPeriod(
  state: CompeteState,
  now: Date,
): Activity[] {
  const period = periodWindow(state, now);
  const start = period.startsAt.getTime();
  const end = period.endsAt.getTime();
  return state.activities
    .filter((activity) => {
      if (activity.sport !== state.primary) return false;
      if (!countsOnTrack(activity, "open")) return false;
      const at = new Date(activity.startedAt).getTime();
      return at >= start && at < end;
    })
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

function volumeLabel(activity: Activity): string {
  const spec = sportById(activity.sport);
  if (spec.gps) {
    const km = activity.distanceM / 1000;
    return `${km >= 10 ? km.toFixed(0) : km.toFixed(1)} km`;
  }
  return `${Math.max(1, Math.round(activity.movingSec / 60))} min`;
}

function weekdayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

export function buildTodayRoute(
  state: CompeteState,
  now: Date = competeNow(state),
): TodayRoute {
  const suggestion = suggestionForState(state, now);
  const past = countedInPeriod(state, now).slice(-2);
  const discs: CheckpointDisc[] = [];

  past.forEach((activity, index) => {
    const anchor = CHECKPOINT_ANCHORS.past[index];
    if (!anchor) return;
    const volume = volumeLabel(activity);
    const day = weekdayLabel(activity.startedAt);
    discs.push({
      id: activity.id,
      role: "past",
      cx: anchor.cx,
      top: anchor.top,
      activityId: activity.id,
      volume,
      title: day,
      detail: `${volume} counted on ${sportById(activity.sport).name.toLowerCase()}.`,
      accessibilityLabel: `${day}, ${volume}. Open activity`,
    });
  });

  const today = CHECKPOINT_ANCHORS.today;
  discs.push({
    id: "today",
    role: "today",
    cx: today.cx,
    top: today.top,
    activityId: null,
    volume: null,
    title: suggestion.title,
    detail: suggestion.detail,
    accessibilityLabel: "Ace at today’s checkpoint. Open recommendation and coaching",
  });

  CHECKPOINT_ANCHORS.future.forEach((anchor, index) => {
    discs.push({
      id: `future-${index}`,
      role: "future",
      cx: anchor.cx,
      top: anchor.top,
      activityId: null,
      volume: null,
      title: "Ahead",
      detail: "Nothing scheduled.",
      accessibilityLabel: "Future checkpoint, no activity scheduled",
    });
  });

  return {
    suggestion,
    discs,
    path: CHECKPOINT_PATH,
    frame: CHECKPOINT_FRAME,
  };
}

function seriesValues(series: CheckpointSeries, gps: boolean): [number, number, number] {
  const source = gps ? series.distanceM.map((meters) => meters / 1000) : series.effort;
  return [source[0] ?? 0, source[1] ?? 0, source[2] ?? 0];
}

export function buildArenaModel(
  state: CompeteState,
  now: Date = competeNow(state),
): ArenaModel {
  const sport = state.primary;
  const spec = sportById(sport);
  const period = periodWindow(state, now);
  const optedIn = Boolean(state.ratings.find((row) => row.sport === sport)?.optedIn);
  const youSeries = activityCheckpoints(
    state.activities,
    sport,
    period.startsAt,
    period.endsAt,
    "open",
    now,
  );
  const board = optedIn ? weeklyBoard(state, sport, "open", now) : [];
  const lanes: ArenaLane[] = board.map((row) => {
    const series = row.you
      ? youSeries
      : syntheticCheckpoints(
          row.effort,
          row.distanceM,
          row.movingSec,
          row.id,
          period.startsAt,
          period.endsAt,
          now,
        );
    return {
      id: row.id,
      name: row.you ? state.name : row.name,
      you: row.you,
      ghost: false,
      values: seriesValues(series, spec.gps),
    };
  });

  const ghost = resolvePastSelfGhost({
    activities: state.activities,
    sport,
    track: "open",
    currentStart: period.startsAt,
    currentEnd: period.endsAt,
    currentLiveAt: youSeries.liveAt,
    periodKind: state.clock.kind,
  });
  if (ghostHasVolume(ghost) && ghost.series) {
    lanes.push({
      id: ghost.id,
      name: ghost.name,
      you: false,
      ghost: true,
      values: seriesValues(ghost.series, spec.gps),
    });
  }

  return {
    sportId: sport,
    sportName: spec.name,
    unit: spec.gps ? "km" : "pts",
    labels: youSeries.labels,
    lanes,
    optedIn,
  };
}

function weekLabel(periodStart: string, periodEnd: string): string {
  const start = new Date(periodStart).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const end = new Date(new Date(periodEnd).getTime() - 1).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${start} – ${end}`;
}

export function awardCards(state: CompeteState): AwardCardModel[] {
  return state.periodResults
    .filter((row) => row.sport === state.primary && row.track === "open")
    .slice(0, 8)
    .map((row) => {
      const delta = row.eloAfter - row.eloBefore;
      const headline = row.frozen
        ? "Week held"
        : row.place === 1
          ? "Took the field"
          : delta > 0
            ? "Closed up"
            : delta < 0
              ? "Closed down"
              : "Settled even";
      return {
        id: row.id,
        sportName: sportById(row.sport).name,
        weekLabel: weekLabel(row.periodStart, row.periodEnd),
        place: formatPlace(row.place, row.fieldSize),
        effort: formatEffort(row.effort),
        delta: formatEloDelta(row.eloBefore, row.eloAfter),
        headline,
      };
    });
}

/** Ids of activities that count on the open track, stable order. */
export function countedActivityIds(state: CompeteState): string[] {
  return state.activities
    .filter((activity) => countsOnTrack(activity, "open"))
    .map((activity) => activity.id)
    .sort();
}

export function newCountedIds(
  previous: readonly string[],
  next: readonly string[],
): string[] {
  const seen = new Set(previous);
  return next.filter((id) => !seen.has(id));
}
