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

/** Drop the durable crewBoard pin; hydrate from crew_week_fields at load. */
export function stripDurableCrewBoard(state: CompeteState): CompeteState {
  if (state.crewBoard == null) return state;
  return { ...state, crewBoard: null };
}

/**
 * Thin account snapshot after relational dual-write. Keeps prefs + ratings shell
 * for offline merge; large collections are rehydrated from tables on load.
 */
export function shrinkCompeteSnapshot(state: CompeteState): CompeteState {
  const clean = stripDurableCrewBoard(sanitizeCompeteStateForAccount(state));
  return {
    ...clean,
    activities: [],
    readiness: [],
    sleepNights: [],
    periodResults: [],
    pendingRevealIds: [],
    enrollments: [],
    duels: [],
    healthResults: [],
    frozenPeriods: [],
    demoNow: null,
    crewBoard: null,
  };
}
