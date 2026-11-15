import {
  normalizeCompeteIntent,
  reduceCompete,
  type Action,
  type CompeteState,
} from "@fitness-battle/shared";

const MAX_INTENTS = 24;

export function applyDispositionIntent(state: CompeteState, action: Action): CompeteState {
  if (action.type !== "set-disposition" || !action.activityId || !action.disposition) {
    return state;
  }
  const disposition = action.disposition;
  return {
    ...state,
    activities: state.activities.map((activity) =>
      activity.id === action.activityId
        ? {
            ...activity,
            disposition,
            dispositionReason:
              disposition === "counted"
                ? "You counted this session."
                : disposition === "excluded"
                  ? "You left this session out of the week."
                  : "Waiting for you to count this session.",
          }
        : activity,
    ),
  };
}

/** Apply account intents before server settlement — dispositions cannot pass through rollClock first. */
export function applyCompeteIntents(
  stored: CompeteState,
  rawActions: Action[],
  userId: string,
  now: Date,
): CompeteState {
  if (!rawActions.length) throw new Error("invalid_intent");
  if (rawActions.length > MAX_INTENTS) throw new Error("invalid_intent");
  const nowIso = now.toISOString();
  const dispositionActions: Action[] = [];
  const otherActions: Action[] = [];
  for (const raw of rawActions) {
    const action = normalizeCompeteIntent(raw, userId, nowIso);
    if (action.type === "set-disposition") dispositionActions.push(action);
    else otherActions.push(action);
  }
  let next = stored;
  for (const action of dispositionActions) {
    next = applyDispositionIntent(next, action);
  }
  for (const action of otherActions) {
    next = reduceCompete(next, action);
  }
  return next;
}