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
 * crewBoard, no pendingRevealIds. Activities may still be present in memory
 * so they can be upserted into `public.activities`.
 */
export function prepareCompeteStateForAccount(
  state: CompeteState,
): CompeteState {
  const cleaned = stripDurableCrewBoard(sanitizeCompeteStateForAccount(state));
  if (cleaned.pendingRevealIds.length === 0) return cleaned;
  return { ...cleaned, pendingRevealIds: [] };
}

/**
 * Stored `compete_snapshots.state` shape for activities.
 * Activities are table-only SoT — never written into the jsonb blob.
 */
export function stripSnapshotActivities(state: CompeteState): CompeteState {
  const prepared = prepareCompeteStateForAccount(state);
  if (prepared.activities.length === 0) return prepared;
  return { ...prepared, activities: [] };
}

/** @deprecated Use stripSnapshotActivities — kept for call sites mid-rename. */
export function thinCompeteStateForAccount(state: CompeteState): CompeteState {
  return stripSnapshotActivities(state);
}

/** Legacy fat blob still carries activities that must be flushed to the table. */
export function snapshotCarriesActivities(state: CompeteState): boolean {
  return state.activities.length > 0;
}

/** @deprecated Use snapshotCarriesActivities. */
export function isFatCompeteSnapshot(state: CompeteState): boolean {
  return snapshotCarriesActivities(state);
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
