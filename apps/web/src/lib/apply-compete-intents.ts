import {
  applyCompeteEdit,
  coalesceSaveActions,
  isCompeteSyncAction,
  isEnrollmentActionAfterSettlement,
  normalizeCompeteIntent,
  reduceCompete,
  type Action,
  type CompeteState,
} from "@fitness-battle/shared";
import { resolveServerSyncAction } from "./resolve-server-sync-action";

const MAX_ACTIONS = 32;

export function applyAccountAction(
  stored: CompeteState,
  raw: Action,
  userId: string,
  now: Date,
): CompeteState {
  const nowIso = now.toISOString();
  const action = isCompeteSyncAction(raw)
    ? resolveServerSyncAction(stored, raw, userId, now)
    : normalizeCompeteIntent(raw, userId, nowIso);
  if (action.type === "set-disposition") {
    return reduceCompete(stored, action);
  }
  return applyCompeteEdit(stored, action);
}

function applyActionList(
  stored: CompeteState,
  rawActions: Action[],
  userId: string,
  now: Date,
): CompeteState {
  let next = stored;
  for (const raw of rawActions) {
    next = applyAccountAction(next, raw, userId, now);
  }
  return next;
}

/** Apply user edits in request order without advancing the competition clock. */
export function applyOrderedAccountActions(
  stored: CompeteState,
  rawActions: Action[],
  userId: string,
  now: Date,
): CompeteState {
  const actions = coalesceSaveActions(rawActions);
  if (!actions.length) throw new Error("invalid_intent");
  if (actions.length > MAX_ACTIONS) throw new Error("invalid_intent");
  return applyActionList(stored, actions, userId, now);
}

/** Preserve request order; settle once before the first enrollment action. */
export async function applyAccountSaveInOrder(
  stored: CompeteState,
  rawActions: Action[],
  userId: string,
  now: Date,
  settle: (state: CompeteState, scoreOpenPeriod: boolean) => Promise<CompeteState>,
): Promise<CompeteState> {
  const actions = coalesceSaveActions(rawActions);
  if (!actions.length) throw new Error("invalid_intent");
  if (actions.length > MAX_ACTIONS) throw new Error("invalid_intent");
  let next = stored;
  let settledBeforeEnrollment = false;
  for (const raw of actions) {
    if (isEnrollmentActionAfterSettlement(raw.type) && !settledBeforeEnrollment) {
      next = await settle(next, false);
      settledBeforeEnrollment = true;
    }
    next = applyAccountAction(next, raw, userId, now);
  }
  return settle(next, true);
}

export const applyCompeteIntents = applyOrderedAccountActions;