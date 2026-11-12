import { unitInterval } from "../compete/sports";
import type { SportId } from "../compete/sports";
import type {
  DensityMatcherConfig,
  GroupAssignment,
  PoolPlayer,
  WaveEnrollment,
  WaveWindow,
} from "./types";
import { DEFAULT_GROUP_CAPACITY } from "./types";
import { waveWindowAt } from "./waves";

const DEFAULT_ELO_BAND = 200;

export interface AssignGroupInput {
  viewerId: string;
  viewerName: string;
  viewerElo: number;
  sport: SportId;
  now?: Date;
  /** Explicit benchmark; instant and scheduled groups share the same model. */
  window?: WaveWindow;
  /**
   * Other real players already enrolled in overlapping waves.
   * Viewer is never selected from this pool.
   */
  realPool?: readonly PoolPlayer[];
  /**
   * Must-seat peers (crew mates). Taken first up to capacity-1; remaining
   * seats use Elo density picks. Empty seats stay empty. Team scoring is out of scope.
   */
  forcedPeers?: readonly PoolPlayer[];
  /** Stable seed so seating does not reshuffle on reload. */
  seed?: string;
  capacity?: number;
  autoEnrollNext?: boolean;
  /** Prefer peers within ±eloBand of the viewer before widening. */
  eloBand?: number;
  /** When set, stamped onto the enrollment for shared-field audits. */
  crewId?: string | null;
}

/**
 * Density matcher: builds a per-viewer local group from real accounts only.
 * Empty seats stay empty.
 */
export class DensityMatcher {
  readonly capacity: number;
  readonly eloBand: number;

  constructor(config: DensityMatcherConfig = {}) {
    this.capacity = config.capacity ?? DEFAULT_GROUP_CAPACITY;
    this.eloBand = config.eloBand ?? DEFAULT_ELO_BAND;
  }

  assignGroup(input: AssignGroupInput): GroupAssignment {
    const now = input.now ?? new Date();
    const capacity = input.capacity ?? this.capacity;
    const eloBand = input.eloBand ?? this.eloBand;
    const window = input.window ?? waveWindowAt(now);
    const need = Math.max(0, capacity - 1);
    const seed =
      input.seed ??
      `${input.viewerId}:${input.sport}:${window.waveStart.toISOString()}`;

    const forced = dedupeForcedPeers(
      input.forcedPeers ?? [],
      input.viewerId,
      need,
    );
    const remaining = Math.max(0, need - forced.length);
    const picked =
      remaining > 0
        ? pickRealPeers({
            pool: (input.realPool ?? []).filter(
              (player) => !forced.some((peer) => peer.id === player.id),
            ),
            viewerId: input.viewerId,
            viewerElo: input.viewerElo,
            sport: input.sport,
            waveStart: window.waveStart,
            weekEnd: window.weekEnd,
            count: remaining,
            eloBand,
            seed,
          })
        : [];
    const peers = [...forced, ...picked];

    const enrollment: WaveEnrollment = {
      sport: input.sport,
      waveStart: window.waveStart.toISOString(),
      weekEnd: window.weekEnd.toISOString(),
      capacity,
      peerIds: peers.map((peer) => peer.id),
      syntheticIds: [],
      autoEnrollNext: input.autoEnrollNext ?? true,
      crewId: input.crewId ?? null,
    };

    return { enrollment, synthetics: [], peers };
  }

  /**
   * When new accounts appear, seat them in open spots.
   * `protectIds` (crew mates) are never dropped to free seats.
   */
  preferReals(
    enrollment: WaveEnrollment,
    availableReals: readonly PoolPlayer[],
    seed = "refresh",
    protectIds: readonly string[] = [],
  ): GroupAssignment {
    const seats = Math.max(0, enrollment.capacity - 1);
    const protectedSet = new Set(protectIds);
    const existingPeers = availableReals.filter((player) =>
      enrollment.peerIds.includes(player.id),
    );
    const newcomers = availableReals.filter(
      (player) =>
        player.sport === enrollment.sport &&
        !enrollment.peerIds.includes(player.id) &&
        wavesOverlap(
          enrollment.waveStart,
          enrollment.weekEnd,
          player.waveStart,
          player.weekEnd,
        ),
    );

    const added = newcomers
      .map((player) => ({
        player,
        rank: unitInterval(`prefer:${seed}:${player.id}`),
      }))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, Math.max(0, seats - existingPeers.length))
      .map((row) => row.player);

    let peers = [...existingPeers, ...added];
    if (peers.length > seats) {
      const protectedPeers = peers.filter((peer) => protectedSet.has(peer.id));
      const flexible = peers.filter((peer) => !protectedSet.has(peer.id));
      peers = [...protectedPeers, ...flexible].slice(0, seats);
    }

    const next: WaveEnrollment = {
      ...enrollment,
      peerIds: peers.map((peer) => peer.id),
      syntheticIds: [],
    };
    return { enrollment: next, synthetics: [], peers };
  }
}

function dedupeForcedPeers(
  peers: readonly PoolPlayer[],
  viewerId: string,
  limit: number,
): PoolPlayer[] {
  const seen = new Set<string>();
  const out: PoolPlayer[] = [];
  for (const peer of peers) {
    if (peer.id === viewerId || seen.has(peer.id)) continue;
    seen.add(peer.id);
    out.push(peer);
    if (out.length >= limit) break;
  }
  return out;
}

function wavesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function pickRealPeers(input: {
  pool: readonly PoolPlayer[];
  viewerId: string;
  viewerElo: number;
  sport: SportId;
  waveStart: Date;
  weekEnd: Date;
  count: number;
  eloBand: number;
  seed: string;
}): PoolPlayer[] {
  if (input.count <= 0) return [];
  const waveStartIso = input.waveStart.toISOString();
  const weekEndIso = input.weekEnd.toISOString();

  const candidates = input.pool.filter(
    (player) =>
      player.id !== input.viewerId &&
      player.sport === input.sport &&
      wavesOverlap(
        waveStartIso,
        weekEndIso,
        player.waveStart,
        player.weekEnd,
      ),
  );

  const inBand = candidates.filter(
    (player) => Math.abs(player.elo - input.viewerElo) <= input.eloBand,
  );
  const pool = inBand.length >= input.count ? inBand : candidates;

  return pool
    .map((player) => ({
      player,
      distance: Math.abs(player.elo - input.viewerElo),
      jitter: unitInterval(`real:${input.seed}:${player.id}`),
    }))
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        a.jitter - b.jitter ||
        a.player.name.localeCompare(b.player.name),
    )
    .slice(0, input.count)
    .map((row) => row.player);
}

export const defaultDensityMatcher = new DensityMatcher();
