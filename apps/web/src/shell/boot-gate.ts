/** Compete boot is ready once we are not stuck on the initial loading empty state. */
export function isCompeteDataReady(
  loadStatus: "local" | "loading" | "ready" | "failed",
  state: unknown,
): boolean {
  return !(loadStatus === "loading" && !state);
}

/** Keep the splash until both the overtake animation and compete data are ready. */
export function shouldShowBootSplash(dataReady: boolean, animationDone: boolean): boolean {
  return !dataReady || !animationDone;
}
