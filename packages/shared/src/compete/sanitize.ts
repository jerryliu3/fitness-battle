import { pendingRevealIdsFromResults } from "./history";
import type { CompeteState } from "./sports";

/**
 * Account-durable compete document. Strips QA-only clock pins so a debug week
 * close cannot become the athlete’s permanent settlement clock.
 */
export function sanitizeCompeteStateForAccount(
  state: CompeteState,
): CompeteState {
  if (state.demoNow == null) return state;
  return { ...state, demoNow: null };
}

/** Drop durable crewBoard pin; hydrate from crew_week_fields at load. */
export function stripDurableCrewBoard(state: CompeteState): CompeteState {
  if (state.crewBoard == null) return state;
  return { ...state, crewBoard: null };
}

/**
 * Account write shape before relational persist: no demoNow, no durable
 * crewBoard, no pendingRevealIds. Collections stay so dual-write can run.
 */
export function prepareCompeteStateForAccount(
  state: CompeteState,
): CompeteState {
  const cleaned = stripDurableCrewBoard(sanitizeCompeteStateForAccount(state));
  if (cleaned.pendingRevealIds.length === 0) return cleaned;
  return { ...cleaned, pendingRevealIds: [] };
}

/**
 * Stored snapshot after successful relational persist.
 * Bulky dual-written collections live in tables; GET hydrates them back.
 * Sleep / health / links / duels / readiness / clock stay in jsonb for now.
 */
export function thinCompeteStateForAccount(state: CompeteState): CompeteState {
  const prepared = prepareCompeteStateForAccount(state);
  return {
    ...prepared,
    activities: [],
    periodResults: [],
    enrollments: [],
    frozenPeriods: [],
    pendingRevealIds: [],
    crewBoard: null,
    demoNow: null,
  };
}

/** True when the stored jsonb still carries dual-written bulk collections. */
export function isFatCompeteSnapshot(state: CompeteState): boolean {
  return (
    state.activities.length > 0 ||
    state.periodResults.length > 0 ||
    state.enrollments.length > 0 ||
    state.frozenPeriods.length > 0
  );
}

/** Recompute pendingRevealIds after relational hydrate / migrate. */
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
