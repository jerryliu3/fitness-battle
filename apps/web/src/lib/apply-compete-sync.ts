import { reduceCompete, type Action, type CompeteState } from "@fitness-battle/shared";
import { applyDispositionIntent } from "./apply-compete-intents";
import { resolveServerSyncAction } from "./resolve-server-sync-action";

/** Merge sync intents only; settlement runs afterward in compete routes. */
export function applyCompeteSyncAction(
  stored: CompeteState,
  raw: Action,
  userId: string,
  now: Date,
): CompeteState {
  const action = resolveServerSyncAction(stored, raw, userId, now);
  let next = stored;
  if (action.type === "apply-sync") {
    const known = new Set(stored.activities.map((row) => row.id));
    const incoming = action.activities ?? [];
    for (const row of incoming) {
      if (known.has(row.id) && row.disposition) {
        next = applyDispositionIntent(next, {
          type: "set-disposition",
          activityId: row.id,
          disposition: row.disposition,
        });
      }
    }
    return reduceCompete(next, {
      ...action,
      activities: incoming.filter((row) => !known.has(row.id)),
    });
  }
  return reduceCompete(next, action);
}