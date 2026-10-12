import {
  competeNow,
  distanceTrackMaxKm,
  initialsFromName,
  interpolateSeries,
  syntheticCheckpoints,
  type CompeteState,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { buildSplitBoard } from "@/features/split/model";

export type FieldViewMode = "pursuit" | "path";
export type PursuitFacing = "forward" | "behind";

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
): FieldModel {
  const board = buildSplitBoard(state, sport, track, now);
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

  const ghost: FieldRunner | null = board.ghostSeries
    ? {
        id: "ghost",
        name: "Your previous week",
        initials: "PW",
        km: (
          gps
            ? board.ghostSeries.distanceM.map((m) => m / 1000)
            : board.ghostSeries.effort.map((e) => e)
        ) as [number, number, number],
        place: 0,
        effort: board.ghostSeries.effort[2]!,
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

export function distanceAt(
  runner: FieldRunner,
  checkpoint: number,
  extraKm = 0,
): number {
  const base = interpolateSeries(runner.km, checkpoint);
  return Math.round((base + (runner.you ? extraKm : 0)) * 1000) / 1000;
}

export function gapKm(
  runner: FieldRunner,
  you: FieldRunner,
  checkpoint: number,
  extraKm = 0,
): number {
  return (
    Math.round(
      (distanceAt(runner, checkpoint, extraKm) -
        distanceAt(you, checkpoint, extraKm)) *
        1000,
    ) / 1000
  );
}

export function formatKm(km: number, digits = 1): string {
  return km.toFixed(digits);
}

export function formatGapLabel(
  runner: FieldRunner,
  you: FieldRunner,
  checkpoint: number,
  unitLabel: string,
  extraKm = 0,
): string {
  if (runner.you) return "Your position";
  const gap = gapKm(runner, you, checkpoint, extraKm);
  if (Math.abs(gap) < 0.001) return "Level with you";
  const abs =
    Math.abs(gap) < 1 ? formatKm(Math.abs(gap), 2) : formatKm(Math.abs(gap), 1);
  return `${abs} ${unitLabel} ${gap > 0 ? "ahead" : "behind"}`;
}

export function orderedRunners(
  runners: FieldRunner[],
  checkpoint: number,
  extraKm = 0,
): FieldRunner[] {
  return [...runners].sort(
    (a, b) =>
      distanceAt(b, checkpoint, extraKm) - distanceAt(a, checkpoint, extraKm) ||
      a.id.localeCompare(b.id),
  );
}
