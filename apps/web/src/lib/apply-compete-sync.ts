import {
  competeNow,
  normalizeCompeteSyncAction,
  reduceCompete,
  rollClock,
  withDerivedPendingReveals,
  type Action,
  type CompeteState,
} from "@fitness-battle/shared";

export function applyCompeteSyncAction(
  stored: CompeteState,
  raw: Action,
  userId: string,
  now: Date,
): CompeteState {
  const action = normalizeCompeteSyncAction(raw, userId, now.toISOString());
  const next = reduceCompete(stored, action);
  return withDerivedPendingReveals(rollClock(next, competeNow(next, now)));
}