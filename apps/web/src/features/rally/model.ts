import {
  activityEffort,
  formatEffort,
  initialsFromName,
  interpolateSeries,
  sportById,
  syntheticCheckpoints,
  type Activity,
  type CheckpointSeries,
  type CompeteState,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import {
  buildSplitBoard,
  type SplitBoardModel,
  type TrackLane,
} from "@/features/split/model";

/** Start + three live cutoffs, matching the Rally prototype replay. */
export type RallyCutoff = 0 | 1 | 2 | 3;

export type RallyUnit = "km" | "pts";

export interface RallyReference {
  id: string;
  name: string;
  initials: string;
  ghost?: boolean;
  you?: boolean;
}

export interface RallyMove {
  id: string;
  title: string;
  day: string;
  date: string;
  km: number;
  minutes: number;
  note: string;
  startedAt: string;
  verified: boolean;
  source: string;
}

export interface RallySnapshot {
  cutoff: RallyCutoff;
  label: string;
  total: number;
  against: number;
  gap: number;
  count: number;
  unit: RallyUnit;
}

export interface RallyLane {
  id: string;
  name: string;
  initials: string;
  you?: boolean;
  place?: number;
  values: [number, number, number];
}

export interface RallyBoard {
  board: SplitBoardModel;
  sport: SportId;
  unit: RallyUnit;
  periodLabel: string;
  youSeries: CheckpointSeries;
  ghostSeries: CheckpointSeries | null;
  moves: RallyMove[];
  lanes: RallyLane[];
  references: RallyReference[];
  movingMinutes: number;
}

export function gapText(gap: number, unit: RallyUnit): string {
  if (Math.abs(gap) < (unit === "km" ? 0.001 : 0.05)) {
    return "Level at this cutoff";
  }
  const amount =
    unit === "km" ? Math.abs(gap).toFixed(1) : formatEffort(Math.abs(gap));
  return `${amount} ${unit} ${gap > 0 ? "ahead" : "behind"}`;
}

export function comparisonScale(total: number, against: number): number {
  return Math.max(5, Math.ceil(Math.max(total, against, 1) / 5) * 5);
}

export function formatRallyValue(value: number, unit: RallyUnit): string {
  return unit === "km" ? value.toFixed(1) : formatEffort(value);
}

function seriesValues(series: CheckpointSeries, unit: RallyUnit): [number, number, number] {
  if (unit === "km") {
    return [
      series.distanceM[0] / 1000,
      series.distanceM[1] / 1000,
      series.distanceM[2] / 1000,
    ];
  }
  return series.effort;
}

function valueAtCutoff(values: [number, number, number], cutoff: RallyCutoff): number {
  if (cutoff <= 0) return 0;
  return (
    Math.round(interpolateSeries(values, cutoff - 1) * 1000) / 1000
  );
}

function moveTitle(activity: Activity, sport: SportId): string {
  const day = new Date(activity.startedAt).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
  const name = sportById(sport).name;
  return `${day} ${name.toLowerCase()}`;
}

export function movesFromActivities(
  activities: Activity[],
  sport: SportId,
): RallyMove[] {
  return activities.map((activity) => {
    const started = new Date(activity.startedAt);
    return {
      id: activity.id,
      title: moveTitle(activity, sport),
      day: started.toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: "UTC",
      }),
      date: started.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      km: Math.round((activity.distanceM / 1000) * 1000) / 1000,
      minutes: Math.max(1, Math.round(activity.movingSec / 60)),
      note: activity.verified
        ? "Verified import. Counted toward this week."
        : "Counted toward this week’s open effort.",
      startedAt: activity.startedAt,
      verified: activity.verified,
      source: activity.source,
    };
  });
}

export function buildRallyBoard(
  state: CompeteState,
  sport: SportId,
  track: ScoreTrack,
  now: Date,
): RallyBoard {
  const board = buildSplitBoard(state, sport, track, now);
  const unit: RallyUnit = sportById(sport).gps ? "km" : "pts";
  const youValues = seriesValues(board.youSeries, unit);
  const ghostValues = board.ghostSeries
    ? seriesValues(board.ghostSeries, unit)
    : null;

  const lanes: RallyLane[] = board.fieldLanes.map((lane: TrackLane) => {
    if (lane.you) {
      return {
        id: lane.id,
        name: "You",
        initials: lane.initials,
        you: true,
        place: lane.place,
        values: youValues,
      };
    }
    const row = board.rows.find((item) => item.id === lane.id);
    const series = syntheticCheckpoints(
      row?.effort ?? lane.effort,
      row?.distanceM ?? 0,
      row?.movingSec ?? 0,
      lane.id,
      board.periodStart,
      board.periodEnd,
      now,
    );
    return {
      id: lane.id,
      name: lane.name,
      initials: lane.initials,
      place: lane.place,
      values: seriesValues(series, unit),
    };
  });

  const references: RallyReference[] = [
    {
      id: "ghost",
      name: "Your previous week",
      initials: "PW",
      ghost: true,
    },
    ...lanes
      .filter((lane) => !lane.you)
      .slice(0, 2)
      .map((lane) => ({
        id: lane.id,
        name: lane.name,
        initials: lane.initials,
      })),
  ];

  return {
    board,
    sport,
    unit,
    periodLabel: board.periodLabel,
    youSeries: board.youSeries,
    ghostSeries: board.ghostSeries,
    moves: movesFromActivities(board.weekActivities, sport),
    lanes,
    references,
    movingMinutes: Math.round(
      board.weekActivities.reduce((sum, activity) => sum + activity.movingSec, 0) /
        60,
    ),
  };
}

export function resolveReference(
  rally: RallyBoard,
  referenceId: string,
): RallyReference {
  if (referenceId === "ghost") {
    return (
      rally.references.find((item) => item.ghost) ?? {
        id: "ghost",
        name: "Your previous week",
        initials: "PW",
        ghost: true,
      }
    );
  }
  const lane = rally.lanes.find((item) => item.id === referenceId);
  if (lane) {
    return {
      id: lane.id,
      name: lane.name,
      initials: lane.initials,
    };
  }
  return rally.references[0]!;
}

export function snapshotAt(
  rally: RallyBoard,
  reference: RallyReference,
  cutoff: RallyCutoff,
): RallySnapshot {
  const youValues = seriesValues(rally.youSeries, rally.unit);
  const againstValues = reference.ghost
    ? rally.ghostSeries
      ? seriesValues(rally.ghostSeries, rally.unit)
      : ([0, 0, 0] as [number, number, number])
    : (rally.lanes.find((lane) => lane.id === reference.id)?.values ??
      ([0, 0, 0] as [number, number, number]));

  const total = valueAtCutoff(youValues, cutoff);
  const against = valueAtCutoff(againstValues, cutoff);
  const labels = ["Start", ...rally.board.checkpointLabels] as const;
  const counted =
    cutoff === 0
      ? 0
      : rally.moves.filter((move) => {
          const at = new Date(move.startedAt);
          // Approximate: counted if activity falls at or before this cutoff share.
          const span =
            rally.board.periodEnd.getTime() - rally.board.periodStart.getTime();
          const progress =
            span <= 0
              ? 1
              : (at.getTime() - rally.board.periodStart.getTime()) / span;
          return progress <= cutoff / 3 + 1e-6;
        }).length;

  return {
    cutoff,
    label: labels[cutoff] ?? "Now",
    total,
    against,
    gap: Math.round((total - against) * 1000) / 1000,
    count: counted,
    unit: rally.unit,
  };
}

/** Snapshot immediately after a specific counted move (receipt semantics). */
export function snapshotAfterMove(
  rally: RallyBoard,
  reference: RallyReference,
  moveIndex: number,
): RallySnapshot {
  const through = rally.moves.slice(0, moveIndex + 1);
  const total =
    rally.unit === "km"
      ? Math.round(through.reduce((sum, move) => sum + move.km, 0) * 1000) / 1000
      : Math.round(
          through.reduce((sum, move) => {
            const activity = rally.board.weekActivities.find(
              (item) => item.id === move.id,
            );
            return activity ? sum + activityEffort(activity) : sum;
          }, 0) * 10,
        ) / 10;

  // Same-time comparison: map move index onto the 1..3 cutoff scale.
  const cutoff = Math.min(3, Math.max(1, moveIndex + 1)) as RallyCutoff;
  const base = snapshotAt(rally, reference, cutoff);
  return {
    ...base,
    total,
    gap: Math.round((total - base.against) * 1000) / 1000,
    count: moveIndex + 1,
  };
}

export function placeAtCutoff(rally: RallyBoard, cutoff: RallyCutoff): number {
  const you = valueAtCutoff(seriesValues(rally.youSeries, rally.unit), cutoff);
  const ahead = rally.lanes.filter(
    (lane) => !lane.you && valueAtCutoff(lane.values, cutoff) > you + 1e-6,
  ).length;
  return ahead + 1;
}

export function laneValueAt(lane: RallyLane, cutoff: RallyCutoff): number {
  return valueAtCutoff(lane.values, cutoff);
}

export function referenceInitials(name: string): string {
  return initialsFromName(name);
}
