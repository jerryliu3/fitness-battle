import {
  competeNow,
  reduceCompete,
  rollClock,
  withDerivedPendingReveals,
  type Action,
  type CompeteState,
} from "@fitness-battle/shared";
import { resolveServerSyncAction } from "./resolve-server-sync-action";

export function applyCompeteSyncAction(
  stored: CompeteState,
  raw: Action,
  userId: string,
  now: Date,
): CompeteState {
  const action = resolveServerSyncAction(stored, raw, userId, now);
  const next = reduceCompete(stored, action);
  return withDerivedPendingReveals(rollClock(next, competeNow(next, now)));
}