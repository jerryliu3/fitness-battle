import type { SportId } from "../compete/sports";

/** Configurable group size for density matching. */
export const DEFAULT_GROUP_CAPACITY = 8;

export type RivalKind = "real" | "synthetic";

/** A player that can appear in someone else's local group. */
export interface PoolPlayer {
  id: string;
  name: string;
  elo: number;
  sport: SportId;
  /** When this player’s own wave started (ISO). Used for pool filtering. */
  waveStart: string;
  /** Exclusive Monday week end for this player’s enrollment (ISO). */
  weekEnd: string;
}

export interface SyntheticRival {
  id: string;
  name: string;
  initials: string;
  elo: number;
  kind: "synthetic";
}

export interface WaveWindow {
  /** Inclusive Monday 00:00 UTC for the week that contains the join. */
  waveStart: Date;
  /** Exclusive UTC Monday midnight when this competition week ends. */
  weekEnd: Date;
}

/**
 * Per-viewer enrollment. Source of truth for *this* user’s board —
 * not a shared central ranking.
 */
export interface WaveEnrollment {
  sport: SportId;
  waveStart: string;
  weekEnd: string;
  capacity: number;
  /** Real peer ids in this viewer’s local group (may overlap other viewers). */
  peerIds: string[];
  /** Synthetic fillers; dropped first when real peers are available. */
  syntheticIds: string[];
  /** After weekEnd, automatically enroll in the next open wave. */
  autoEnrollNext: boolean;
}

export interface GroupAssignment {
  enrollment: WaveEnrollment;
  synthetics: SyntheticRival[];
  peers: PoolPlayer[];
}

export interface LocalBoardRow {
  id: string;
  name: string;
  elo: number;
  kind: RivalKind;
  /** Effort accumulated inside the viewer’s wave window only. */
  effort: number;
  distanceM: number;
  movingSec: number;
  you: boolean;
  place: number;
}

export interface DensityMatcherConfig {
  /** Target group size including the viewer. */
  capacity?: number;
  /**
   * Soft Elo band (half-width) when preferring nearby real peers.
   * Random among candidates inside the band; falls back to full pool.
   */
  eloBand?: number;
}
