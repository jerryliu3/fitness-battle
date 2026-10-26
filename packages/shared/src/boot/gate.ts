import type { CompeteLoadStatus } from "./load-status";

/**
 * Compete boot is ready once we are not stuck on the initial loading empty state.
 * Local cache may still be shown while `loading` until the remote fetch settles.
 */
export function isCompeteDataReady(loadStatus: CompeteLoadStatus, state: unknown): boolean {
  return !(loadStatus === "loading" && !state);
}

/**
 * Keep the splash until both the overtake animation and compete data are ready.
 * Animation always runs to completion even when data is already available.
 */
export function shouldShowBootSplash(dataReady: boolean, animationDone: boolean): boolean {
  return !dataReady || !animationDone;
}
