import { competitionPlace } from "../competition-place";
import { periodEffort } from "../compete/effort";
import {
  athleteWeekDistanceM,
  athleteWeekMovingSec,
} from "../compete/track";
import { athleteWeekEffort, type FieldAthlete } from "../compete/field";
import { sportById, type Activity, type ScoreTrack, type SportId } from "../compete/sports";
import { findSynthetic, syntheticVolumeInWindow } from "./synthetic-bank";
import type {
  LocalBoardRow,
  PoolPlayer,
  WaveEnrollment,
} from "./types";
import { waveLengthDays } from "./waves";

export interface LocalBoardInput {
  enrollment: WaveEnrollment;
  viewer: {
    id: string;
    name: string;
    elo: number;
    activities: Activity[];
    readiness?: { provider: string; day: string; score: number }[];
    primarySport?: SportId;
  };
  /** Real peers resolved from the pool (must cover enrollment.peerIds). */
  peers: readonly PoolPlayer[];
  /**
   * Optional known activity streams for real peers. When missing, peers are
   * scored with a clipped synthetic estimate (demo / sparse pool).
   */
  peerActivities?: ReadonlyMap<string, Activity[]>;
  track: ScoreTrack;
  asOf?: Date;
}

/**
 * Scale a full-week synthetic estimate down to the viewer's wave length and
 * elapsed days — this is the "no prorating of prior days": only the overlapping
 * window contributes, approximated when we lack peer GPS.
 */
export function clipFullWeekEstimate(
  fullWeekValue: number,
  waveStart: Date,
  weekEnd: Date,
  asOf: Date,
): number {
  const length = waveLengthDays({ waveStart, weekEnd });
  const through = Math.min(asOf.getTime(), weekEnd.getTime());
  if (through <= waveStart.getTime()) return 0;
  const elapsedDays = Math.max(
    0,
    (through - waveStart.getTime()) / 86_400_000,
  );
  // fullWeekValue is a 7-day expectation; take the share for elapsed days in-wave.
  return fullWeekValue * (Math.min(elapsedDays, length) / 7);
}

function peerVolume(
  peer: PoolPlayer,
  enrollment: WaveEnrollment,
  track: ScoreTrack,
  asOf: Date,
  peerActivities?: ReadonlyMap<string, Activity[]>,
): { effort: number; distanceM: number; movingSec: number } {
  const waveStart = new Date(enrollment.waveStart);
  const weekEnd = new Date(enrollment.weekEnd);
  const activities = peerActivities?.get(peer.id);
  if (activities) {
    return periodEffort(
      activities,
      enrollment.sport,
      waveStart,
      // Clip exclusive end to asOf so live boards match the viewer clock.
      new Date(Math.min(asOf.getTime(), weekEnd.getTime())),
      track,
    );
  }

  // Demo / sparse pool: treat pool player like a field athlete, then clip
  // to the viewer's wave (exclude pre-wave distance).
  const athlete: FieldAthlete = {
    id: peer.id,
    name: peer.name,
    city: "",
    elo: peer.elo,
  };
  const fullEffort = athleteWeekEffort(
    athlete,
    enrollment.waveStart,
    track,
  );
  const fullDistance = athleteWeekDistanceM(
    athlete,
    enrollment.waveStart,
    track,
    enrollment.sport,
  );
  const fullMoving = athleteWeekMovingSec(
    athlete,
    enrollment.waveStart,
    track,
    enrollment.sport,
  );
  return {
    effort: clipFullWeekEstimate(fullEffort, waveStart, weekEnd, asOf),
    distanceM: Math.round(
      clipFullWeekEstimate(fullDistance, waveStart, weekEnd, asOf),
    ),
    movingSec: Math.round(
      clipFullWeekEstimate(fullMoving, waveStart, weekEnd, asOf),
    ),
  };
}

/**
 * Build the viewer's local leaderboard. Effort for every rival is clipped to
 * [enrollment.waveStart, enrollment.weekEnd) — the viewer's source of truth.
 */
export function buildLocalBoard(input: LocalBoardInput): LocalBoardRow[] {
  const asOf = input.asOf ?? new Date();
  const waveStart = new Date(input.enrollment.waveStart);
  const weekEnd = new Date(input.enrollment.weekEnd);
  const sport = input.enrollment.sport;
  const gps = sportById(sport).gps;

  const through = new Date(Math.min(asOf.getTime(), weekEnd.getTime()));
  const youVolume = periodEffort(
    input.viewer.activities,
    sport,
    waveStart,
    through,
    input.track,
  );

  const rows: LocalBoardRow[] = [
    {
      id: input.viewer.id,
      name: input.viewer.name,
      elo: input.viewer.elo,
      kind: "real",
      effort: youVolume.effort,
      distanceM: youVolume.distanceM,
      movingSec: youVolume.movingSec,
      you: true,
      place: 0,
    },
  ];

  const peerById = new Map(input.peers.map((peer) => [peer.id, peer]));
  for (const peerId of input.enrollment.peerIds) {
    const peer = peerById.get(peerId);
    if (!peer) continue;
    const volume = peerVolume(
      peer,
      input.enrollment,
      input.track,
      asOf,
      input.peerActivities,
    );
    rows.push({
      id: peer.id,
      name: peer.name,
      elo: peer.elo,
      kind: "real",
      effort: volume.effort,
      distanceM: volume.distanceM,
      movingSec: volume.movingSec,
      you: false,
      place: 0,
    });
  }

  for (const syntheticId of input.enrollment.syntheticIds) {
    const rival = findSynthetic(sport, syntheticId);
    if (!rival) continue;
    const volume = syntheticVolumeInWindow(
      rival,
      sport,
      waveStart,
      weekEnd,
      input.track,
      asOf,
      gps,
    );
    rows.push({
      id: rival.id,
      name: rival.name,
      elo: rival.elo,
      kind: "synthetic",
      effort: volume.effort,
      distanceM: volume.distanceM,
      movingSec: volume.movingSec,
      you: false,
      place: 0,
    });
  }

  const total = (row: LocalBoardRow) => gps ? row.distanceM : row.effort;
  rows.sort((a, b) => total(b) - total(a) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const values = rows.map(total);
  return rows.map(row => ({ ...row, place: competitionPlace(values, total(row)) }));
}
