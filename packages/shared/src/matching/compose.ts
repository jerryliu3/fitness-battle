import { unitInterval } from "../compete/sports";
import type { SportId } from "../compete/sports";
import { findSynthetic, pickSynthetics } from "./synthetic-bank";
import type {
  DensityMatcherConfig,
  GroupAssignment,
  PoolPlayer,
  SyntheticRival,
  WaveEnrollment,
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
  /**
   * Other real players already enrolled in overlapping waves.
   * Viewer is never selected from this pool.
   */
  realPool?: readonly PoolPlayer[];
  /**
   * Must-seat peers (crew mates). Taken first up to capacity-1; remaining
   * seats use Elo density picks then synthetics. Team scoring is out of scope.
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
 * Density matcher: builds a per-viewer local group of size N.
 * Reals are preferred; synthetics fill gaps and are dropped first when
 * more reals become available (`preferReals`).
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
    const window = waveWindowAt(now);
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

    const synthetics = pickSynthetics(
      input.sport,
      input.viewerElo,
      need - peers.length,
      peers.map((peer) => peer.id),
      seed,
    );

    const enrollment: WaveEnrollment = {
      sport: input.sport,
      waveStart: window.waveStart.toISOString(),
      weekEnd: window.weekEnd.toISOString(),
      capacity,
      peerIds: peers.map((peer) => peer.id),
      syntheticIds: synthetics.map((rival) => rival.id),
      autoEnrollNext: input.autoEnrollNext ?? true,
      crewId: input.crewId ?? null,
    };

    return { enrollment, synthetics, peers };
  }

  /**
   * When new reals appear, drop synthetics first to make room — never kick
   * an existing real peer unless capacity is somehow exceeded.
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

    const openSlots = Math.max(0, seats - existingPeers.length);
    const added = newcomers
      .map((player) => ({
        player,
        rank: unitInterval(`prefer:${seed}:${player.id}`),
      }))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, openSlots)
      .map((row) => row.player);

    // Drop synthetics to free seats for newcomers beyond openSlots.
    const stillNeed = Math.max(
      0,
      Math.min(newcomers.length, seats - existingPeers.length) - added.length,
    );
    const forced = newcomers
      .filter((player) => !added.some((row) => row.id === player.id))
      .slice(0, stillNeed);

    let peers = [...existingPeers, ...added, ...forced];
    if (peers.length > seats) {
      const protectedPeers = peers.filter((peer) => protectedSet.has(peer.id));
      const flexible = peers.filter((peer) => !protectedSet.has(peer.id));
      peers = [...protectedPeers, ...flexible].slice(0, seats);
    }
    const syntheticSlots = Math.max(0, seats - peers.length);
    const keptSyntheticIds = enrollment.syntheticIds.slice(0, syntheticSlots);
    // Top up if preferReals ran when the group was under-filled.
    const topUp = pickSynthetics(
      enrollment.sport,
      peers[0]?.elo ?? 1000,
      syntheticSlots - keptSyntheticIds.length,
      [...peers.map((p) => p.id), ...keptSyntheticIds],
      seed,
    );
    const synthetics = [
      ...keptSyntheticIds
        .map((id) => findSynthetic(enrollment.sport, id))
        .filter((row): row is SyntheticRival => row != null),
      ...topUp,
    ].slice(0, syntheticSlots);

    const next: WaveEnrollment = {
      ...enrollment,
      peerIds: peers.map((peer) => peer.id),
      syntheticIds: synthetics.map((rival) => rival.id),
    };
    return { enrollment: next, synthetics, peers };
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
