import {
  competeNow,
  sportById,
  distanceTrackMaxKm,
  ghostHasVolume,
  initialsFromName,
  syntheticCheckpoints,
  type ArenaDistanceUnit,
  type CompeteState,
  type GhostPeriodSelector,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { buildSplitBoard } from "@/features/split/model";

export interface FieldRunner {
  id: string;
  name: string;
  initials: string;
  /** Cumulative display distance (km or mi) or effort points at three checkpoints. */
  km: [number, number, number];
  place: number;
  effort: number;
  you?: boolean;
  ghost?: boolean;
}

export interface FieldModel {
  sport: SportId;
  track: ScoreTrack;
  runners: FieldRunner[];
  ghost: FieldRunner | null;
  you: FieldRunner | null;
  referenceKm: number;
  checkpointLabels: [string, string, string];
  gps: boolean;
  unit: ArenaDistanceUnit;
}

function displaySeries(
  distanceM: number[],
  effort: number[],
  gps: boolean,
  units: CompeteState["units"],
): [number, number, number] {
  if (!gps) {
    return [effort[0] ?? 0, effort[1] ?? 0, effort[2] ?? 0];
  }
  const divisor = units === "metric" ? 1000 : 1609.344;
  return [
    (distanceM[0] ?? 0) / divisor,
    (distanceM[1] ?? 0) / divisor,
    (distanceM[2] ?? 0) / divisor,
  ];
}

export function buildFieldModel(
  state: CompeteState,
  sport: SportId,
  track: ScoreTrack,
  now: Date = competeNow(state),
  options?: { ghostSelector?: GhostPeriodSelector },
): FieldModel {
  const board = buildSplitBoard(state, sport, track, now, options);
  const gps = sportById(sport).gps;
  const unit: ArenaDistanceUnit = gps
    ? state.units === "metric"
      ? "km"
      : "mi"
    : "pts";

  const runners: FieldRunner[] = board.rows.map((row) => {
    const series = row.you
      ? board.youSeries
      : syntheticCheckpoints(
          row.effort,
          row.distanceM,
          row.movingSec,
          row.id,
          board.periodStart,
          board.periodEnd,
          now,
        );
    const km = displaySeries(
      series.distanceM,
      series.effort,
      gps,
      state.units,
    );
    return {
      id: row.id,
      name: row.you ? state.name : row.name,
      initials: row.you
        ? initialsFromName(state.name)
        : initialsFromName(row.name),
      km,
      place: row.place,
      effort: row.effort,
      you: row.you,
    };
  });

  const ghost: FieldRunner | null =
    ghostHasVolume(board.ghost) && board.ghost.series
      ? {
          id: board.ghost.id,
          name: board.ghost.name,
          initials: board.ghost.initials,
          km: displaySeries(
            board.ghost.series.distanceM,
            board.ghost.series.effort,
            gps,
            state.units,
          ),
          place: 0,
          effort: board.ghost.series.effort[2]!,
          ghost: true,
        }
      : null;

  const you = runners.find((runner) => runner.you) ?? null;
  const peak = [
    ...runners.map((runner) => runner.km[2]!),
    ...(ghost ? [ghost.km[2]!] : []),
  ];

  return {
    sport,
    track,
    runners,
    ghost,
    you,
    referenceKm: distanceTrackMaxKm(peak),
    checkpointLabels: board.checkpointLabels,
    gps,
    unit,
  };
}
