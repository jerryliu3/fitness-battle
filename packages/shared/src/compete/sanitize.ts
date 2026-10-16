import { pendingRevealIdsFromResults } from "./history";
import type { CompeteState } from "./sports";

/**
 * Account-durable compete document. Strips QA-only clock pins so a debug week
 * close cannot become the athlete’s permanent settlement clock.
 */
export function sanitizeCompeteStateForAccount(
  state: CompeteState,
): CompeteState {
  const withoutDemo =
    state.demoNow == null ? state : { ...state, demoNow: null };
  // Practice 1v1 is retired; strip any leftover rows on account write/load.
  if (withoutDemo.duels.length === 0) return withoutDemo;
  return { ...withoutDemo, duels: [] };
}

/** Drop durable crewBoard pin; hydrate from crew_week_fields at load. */
export function stripDurableCrewBoard(state: CompeteState): CompeteState {
  if (state.crewBoard == null) return state;
  return { ...state, crewBoard: null };
}

/**
 * Shape used before relational persist: no demoNow, no durable crewBoard,
 * no pendingRevealIds (derived from acknowledgedAt).
 */
export function prepareCompeteStateForAccount(
  state: CompeteState,
): CompeteState {
  const cleaned = stripDurableCrewBoard(sanitizeCompeteStateForAccount(state));
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
