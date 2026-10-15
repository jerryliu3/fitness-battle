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

/** Account write shape: no demoNow, no durable crewBoard pin. */
export function prepareCompeteStateForAccount(
  state: CompeteState,
): CompeteState {
  return stripDurableCrewBoard(sanitizeCompeteStateForAccount(state));
}
