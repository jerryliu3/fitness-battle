import type { PoolPlayer } from "../matching";
import { daysLeft, projectedElo, weeklyBoard, type BoardRow } from "./engine";
import {
  SPORT_IDS,
  type Activity,
  type CompeteState,
  type PeerActivity,
  type PeriodResult,
  type SportId,
} from "./sports";

export interface AdminGroup {
  sport: SportId;
  optedIn: boolean;
  frozen: boolean;
  waveStart: string | null;
  weekEnd: string | null;
  daysLeft: number | null;
  capacity: number | null;
  peerIds: string[];
  syntheticIds: string[];
  rows: BoardRow[];
  youPlace: number | null;
  projectedOpen: number;
  projectedVerified: number;
  openElo: number;
  verifiedElo: number;
}

/** Read-only picture of every sport on this device's pinned clock. */
export interface AdminSnapshot {
  now: string;
  pinned: boolean;
  wall: string;
  primary: SportId;
  name: string;
  city: string;
  groups: AdminGroup[];
  activities: Activity[];
  peerActivities: PeerActivity[];
  peers: PoolPlayer[];
  results: PeriodResult[];
  freezesLeft: number;
}

export function adminSnapshot(
  state: CompeteState,
  wall: Date = new Date(),
): AdminSnapshot {
  const now = state.demoNow ? new Date(state.demoNow) : wall;
  const groups = SPORT_IDS.map((sport) => {
    const rating = state.ratings.find((item) => item.sport === sport);
    const enrollment = state.enrollments.find((item) => item.sport === sport);
    const rows = enrollment ? weeklyBoard(state, sport, "open", now) : [];
    const you = rows.find((row) => row.you) ?? null;
    return {
      sport,
      optedIn: Boolean(rating?.optedIn),
      frozen: enrollment
        ? state.frozenPeriods.includes(enrollment.waveStart)
        : false,
      waveStart: enrollment?.waveStart ?? null,
      weekEnd: enrollment?.weekEnd ?? null,
      daysLeft: enrollment
        ? daysLeft(
            {
              kind: "weekly",
              startsAt: new Date(enrollment.waveStart),
              endsAt: new Date(enrollment.weekEnd),
            },
            now,
          )
        : null,
      capacity: enrollment?.capacity ?? null,
      peerIds: enrollment?.peerIds ?? [],
      syntheticIds: enrollment?.syntheticIds ?? [],
      rows,
      youPlace: you?.place ?? null,
      projectedOpen: projectedElo(state, sport, "open", now),
      projectedVerified: projectedElo(state, sport, "verified", now),
      openElo: rating?.openElo ?? 0,
      verifiedElo: rating?.verifiedElo ?? 0,
    };
  });

  return {
    now: now.toISOString(),
    pinned: Boolean(state.demoNow),
    wall: wall.toISOString(),
    primary: state.primary,
    name: state.name,
    city: state.city,
    groups,
    activities: [...state.activities].sort((a, b) =>
      b.startedAt.localeCompare(a.startedAt),
    ),
    peerActivities: state.peerActivities,
    peers: state.localPeers ?? [],
    results: state.periodResults,
    freezesLeft: state.freezesLeft,
  };
}
