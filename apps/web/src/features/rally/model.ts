import {
  activityEffort,
  formatEffort,
  interpolateSeries,
  sportById,
  syntheticCheckpoints,
  type Activity,
  type CheckpointSeries,
  type CompeteState,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { buildSplitBoard, type SplitBoardModel } from "@/features/split/model";

/** Start + three live cutoffs for week replay. */
export type RallyCutoff = 0 | 1 | 2 | 3;
export type RallyUnit = "km" | "pts";

export interface RallyReference {
  id: string;
  name: string;
  initials: string;
  ghost?: boolean;
  /** Stable ghost id from the shared GhostReference when subject is past_self. */
  ghostId?: string;
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
  /** Effort points for this activity (non-GPS matchups). */
  effort: number;
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
  values: [number, number, number];
}

export interface RallyBoard {
  board: SplitBoardModel;
  unit: RallyUnit;
  periodLabel: string;
  moves: RallyMove[];
  lanes: RallyLane[];
  references: RallyReference[];
  youValues: [number, number, number];
  ghostValues: [number, number, number] | null;
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

function seriesValues(
  series: CheckpointSeries,
  unit: RallyUnit,
): [number, number, number] {
  if (unit === "km") {
    return [
      series.distanceM[0] / 1000,
      series.distanceM[1] / 1000,
      series.distanceM[2] / 1000,
    ];
  }
  return series.effort;
}

function valueAtCutoff(
  values: [number, number, number],
  cutoff: RallyCutoff,
): number {
  if (cutoff <= 0) return 0;
  return Math.round(interpolateSeries(values, cutoff - 1) * 1000) / 1000;
}

/** Week progress 0..1 for a timestamp inside the period. */
export function weekProgress(
  iso: string,
  periodStart: Date,
  periodEnd: Date,
): number {
  const span = periodEnd.getTime() - periodStart.getTime();
  if (span <= 0) return 1;
  const raw =
    (new Date(iso).getTime() - periodStart.getTime()) / span;
  return Math.min(1, Math.max(0, raw));
}

/**
 * Interpolate Start + three checkpoint values by week progress (0..1).
 * Used for same-point receipts, independent of the 0..3 replay scrubber.
 */
export function valueAtProgress(
  values: [number, number, number],
  progress: number,
): number {
  const series = [0, ...values];
  const t = Math.min(3, Math.max(0, progress * 3));
  const i = Math.min(2, Math.floor(t));
  return (
    Math.round(
      (series[i]! + (series[i + 1]! - series[i]!) * (t - i)) * 1000,
    ) / 1000
  );
}

export function moveIsCounted(
  move: RallyMove,
  cutoff: RallyCutoff,
  periodStart: Date,
  periodEnd: Date,
): boolean {
  if (cutoff <= 0) return false;
  if (cutoff >= 3) return true;
  return (
    weekProgress(move.startedAt, periodStart, periodEnd) <= cutoff / 3 + 1e-9
  );
}

export function movesFromActivities(
  activities: Activity[],
  sport: SportId,
): RallyMove[] {
  const sportName = sportById(sport).name.toLowerCase();
  return activities.map((activity) => {
    const started = new Date(activity.startedAt);
    const day = started.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "UTC",
    });
    return {
      id: activity.id,
      title: `${day} ${sportName}`,
      day,
      date: started.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      km: Math.round((activity.distanceM / 1000) * 1000) / 1000,
      minutes: Math.max(1, Math.round(activity.movingSec / 60)),
      note:
        activity.dispositionReason ??
        (activity.disposition === "pending"
          ? "Pending. Count it to add it to the week."
          : activity.disposition === "excluded"
            ? "Excluded from this week."
            : activity.provenance === "demo"
              ? "Sample session. Not a recorded workout."
              : activity.verified
                ? "Recorded and verified. Counted toward this week."
                : "Counted toward this week’s open effort."),
      startedAt: activity.startedAt,
      verified: activity.verified,
      source: activity.source,
      effort: activityEffort(activity),
    };
  });
}

function againstValuesFor(
  rally: Pick<RallyBoard, "ghostValues" | "lanes">,
  reference: RallyReference,
): [number, number, number] {
  if (reference.ghost) {
    return rally.ghostValues ?? [0, 0, 0];
  }
  return (
    rally.lanes.find((lane) => lane.id === reference.id)?.values ?? [0, 0, 0]
  );
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
  const ghostValues = board.ghost.series
    ? seriesValues(board.ghost.series, unit)
    : null;

  const lanes: RallyLane[] = board.fieldLanes.map((lane) => {
    if (lane.you) {
      return {
        id: lane.id,
        name: "You",
        initials: lane.initials,
        you: true,
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
      values: seriesValues(series, unit),
    };
  });

  const rivals = lanes.filter((lane) => !lane.you);
  const references: RallyReference[] = [
    {
      id: "ghost",
      name: board.ghost.name,
      initials: board.ghost.initials,
      ghost: true,
      ghostId: board.ghost.id,
    },
    ...rivals.slice(0, 2).map((lane) => ({
      id: lane.id,
      name: lane.name,
      initials: lane.initials,
    })),
  ];

  return {
    board,
    unit,
    periodLabel: board.periodLabel,
    moves: movesFromActivities(board.weekActivities, sport),
    lanes,
    references,
    youValues,
    ghostValues,
  };
}

export function resolveReference(
  rally: RallyBoard,
  referenceId: string,
): RallyReference {
  return (
    rally.references.find((item) => item.id === referenceId) ??
    rally.references[0]!
  );
}

export function snapshotAt(
  rally: RallyBoard,
  reference: RallyReference,
  cutoff: RallyCutoff,
): RallySnapshot {
  const total = valueAtCutoff(rally.youValues, cutoff);
  const against = valueAtCutoff(againstValuesFor(rally, reference), cutoff);
  const labels = ["Start", ...rally.board.checkpointLabels] as const;
  const count =
    cutoff <= 0
      ? 0
      : rally.moves.filter((move) =>
          moveIsCounted(
            move,
            cutoff,
            rally.board.periodStart,
            rally.board.periodEnd,
          ),
        ).length;

  return {
    cutoff,
    label: labels[cutoff] ?? "Now",
    total,
    against,
    gap: Math.round((total - against) * 1000) / 1000,
    count,
    unit: rally.unit,
  };
}

/** Receipt: your cumulative after this move vs reference at the same week progress. */
export function snapshotAfterMove(
  rally: RallyBoard,
  reference: RallyReference,
  moveIndex: number,
): RallySnapshot {
  const index = Math.max(0, Math.min(rally.moves.length - 1, moveIndex));
  const move = rally.moves[index]!;
  const through = rally.moves.slice(0, index + 1);
  const total =
    rally.unit === "km"
      ? Math.round(through.reduce((sum, item) => sum + item.km, 0) * 1000) /
        1000
      : Math.round(through.reduce((sum, item) => sum + item.effort, 0) * 10) /
        10;

  const progress = weekProgress(
    move.startedAt,
    rally.board.periodStart,
    rally.board.periodEnd,
  );
  const against = valueAtProgress(
    againstValuesFor(rally, reference),
    progress,
  );

  return {
    cutoff: 3,
    label: move.day,
    total,
    against,
    gap: Math.round((total - against) * 1000) / 1000,
    count: index + 1,
    unit: rally.unit,
  };
}
