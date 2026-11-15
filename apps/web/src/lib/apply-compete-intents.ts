import {
  applyCompeteEdit,
  coalesceSaveActions,
  isCompeteSyncAction,
  normalizeCompeteIntent,
  prepareAccountForUserEdits,
  type Action,
  type CompeteState,
} from "@fitness-battle/shared";
import { resolveServerSyncAction } from "./resolve-server-sync-action";

const MAX_ACTIONS = 32;

/** Apply user edits in request order; canonical settlement runs afterward in compete routes. */
export function applyOrderedAccountActions(
  stored: CompeteState,
  rawActions: Action[],
  userId: string,
  now: Date,
): CompeteState {
  const actions = coalesceSaveActions(rawActions);
  if (!actions.length) throw new Error("invalid_intent");
  if (actions.length > MAX_ACTIONS) throw new Error("invalid_intent");
  const nowIso = now.toISOString();
  let next = prepareAccountForUserEdits(stored, now);
  for (const raw of actions) {
    const action = isCompeteSyncAction(raw)
      ? resolveServerSyncAction(next, raw, userId, now)
      : normalizeCompeteIntent(raw, userId, nowIso);
    next = applyCompeteEdit(next, action);
  }
  return next;
}

export const applyCompeteIntents = applyOrderedAccountActions;