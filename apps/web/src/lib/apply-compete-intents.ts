import {
  competeNow,
  normalizeCompeteIntent,
  reduceCompete,
  rollClock,
  withDerivedPendingReveals,
  type Action,
  type CompeteState,
} from "@fitness-battle/shared";

const MAX_INTENTS = 24;

export function applyCompeteIntents(
  stored: CompeteState,
  rawActions: Action[],
  userId: string,
  now: Date,
): CompeteState {
  if (!rawActions.length) throw new Error("invalid_intent");
  if (rawActions.length > MAX_INTENTS) throw new Error("invalid_intent");
  const nowIso = now.toISOString();
  let next = stored;
  for (const raw of rawActions) {
    const action = normalizeCompeteIntent(raw, userId, nowIso);
    next = reduceCompete(next, action);
  }
  return withDerivedPendingReveals(rollClock(next, competeNow(next, now)));
}