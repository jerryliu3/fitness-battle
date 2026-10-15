import {
  competeNow,
  distanceTrackMaxKm,
  ghostHasVolume,
  initialsFromName,
  syntheticCheckpoints,
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
  /** Cumulative km at three checkpoints. */
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
}

export function buildFieldModel(
  state: CompeteState,
  sport: SportId,
  track: ScoreTrack,
  now: Date = competeNow(state),
  options?: { ghostSelector?: GhostPeriodSelector },
): FieldModel {
  const board = buildSplitBoard(state, sport, track, now, options);
  const gps = sport === "running" || sport === "cycling";

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
    const km = (
      gps
        ? series.distanceM.map((m) => m / 1000)
        : series.effort.map((e) => e)
    ) as [number, number, number];
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
          km: (
            gps
              ? board.ghost.series.distanceM.map((m) => m / 1000)
              : board.ghost.series.effort.map((e) => e)
          ) as [number, number, number],
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
  };
}
