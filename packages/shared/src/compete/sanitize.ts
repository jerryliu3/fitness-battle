import { withAccountEloBaseline } from "./engine";
import { pendingRevealIdsFromResults } from "./history";
import type { CompeteState } from "./sports";

/**
 * Account-durable compete document. Strips QA-only clock pins so a debug week
 * close cannot become the athlete’s permanent settlement clock.
 * Also lifts unranked guest scores (0) to the account baseline (1000).
 */
export function sanitizeCompeteStateForAccount(
  state: CompeteState,
): CompeteState {
  const withoutDemo =
    state.demoNow == null ? state : { ...state, demoNow: null };
  // Practice 1v1 is retired; strip any leftover rows on account write/load.
  const withoutDuels =
    withoutDemo.duels.length === 0
      ? withoutDemo
      : { ...withoutDemo, duels: [] };
  return withAccountEloBaseline(withoutDuels);
}

/** Drop live field snapshots; hydrate them from week_fields at load. */
export function stripDurableCrewBoard(state: CompeteState): CompeteState {
  if (state.crewBoard == null && !state.enrollments.some(item => item.fieldBoard || item.scoringActivities || item.awaitingField !== undefined)) return state;
  return { ...state, crewBoard: null, enrollments: state.enrollments.map(({ fieldBoard: _fieldBoard, scoringActivities: _scoringActivities, awaitingField: _awaitingField, ...item }) => item) };
}

/**
 * Shape used before relational persist: no demoNow, no durable crewBoard,
 * no pendingRevealIds (derived from acknowledgedAt).
 */
export function prepareCompeteStateForAccount(
  state: CompeteState,
): CompeteState {
  const { requiresCanonicalFields: _requiresCanonicalFields, ...durable } = state;
  const cleaned = stripDurableCrewBoard(sanitizeCompeteStateForAccount(durable));
  if (cleaned.pendingRevealIds.length === 0) return cleaned;
  return { ...cleaned, pendingRevealIds: [] };
}

/** Recompute pendingRevealIds after relational hydrate. */
export function withDerivedPendingReveals(state: CompeteState): CompeteState {
  const pendingRevealIds = pendingRevealIdsFromResults(state.periodResults);
  if (
    pendingRevealIds.length === state.pendingRevealIds.length &&
    pendingRevealIds.every((id, i) => id === state.pendingRevealIds[i])
  ) {
    return state;
  }
  return { ...state, pendingRevealIds };
}
