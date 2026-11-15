import {
  applyCompeteEdit,
  coalesceSaveActions,
  isCompeteSyncAction,
  normalizeCompeteIntent,
  partitionEnrollmentSaveActions,
  type Action,
  type CompeteState,
} from "@fitness-battle/shared";
import { resolveServerSyncAction } from "./resolve-server-sync-action";

const MAX_ACTIONS = 32;

function applyActionList(
  stored: CompeteState,
  rawActions: Action[],
  userId: string,
  now: Date,
): CompeteState {
  const nowIso = now.toISOString();
  let next = stored;
  for (const raw of rawActions) {
    const action = isCompeteSyncAction(raw)
      ? resolveServerSyncAction(next, raw, userId, now)
      : normalizeCompeteIntent(raw, userId, nowIso);
    next = applyCompeteEdit(next, action);
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

/** Profile, tracker, and disposition edits before settlement; enrollments after. */
export function applyAccountSaveBeforeSettlement(
  stored: CompeteState,
  rawActions: Action[],
  userId: string,
  now: Date,
): CompeteState {
  const actions = coalesceSaveActions(rawActions);
  if (!actions.length) throw new Error("invalid_intent");
  if (actions.length > MAX_ACTIONS) throw new Error("invalid_intent");
  const { edits } = partitionEnrollmentSaveActions(actions);
  return applyActionList(stored, edits, userId, now);
}

export function applyAccountSaveAfterSettlement(
  stored: CompeteState,
  rawActions: Action[],
  userId: string,
  now: Date,
): CompeteState {
  const actions = coalesceSaveActions(rawActions);
  const { enrollments } = partitionEnrollmentSaveActions(actions);
  if (!enrollments.length) return stored;
  return applyActionList(stored, enrollments, userId, now);
}

export const applyCompeteIntents = applyOrderedAccountActions;