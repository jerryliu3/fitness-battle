import { type Action, type CompeteState } from "@fitness-battle/shared";
import { applyOrderedAccountActions } from "./apply-compete-intents";

/** Legacy single-action sync route — same ordered apply path as batch intents. */
export function applyCompeteSyncAction(
  stored: CompeteState,
  raw: Action,
  userId: string,
  now: Date,
): CompeteState {
  return applyOrderedAccountActions(stored, [raw], userId, now);
}