/** Semantic haptic cues — map to platform APIs at the UI boundary only. */
export type HapticCue =
  | "selection"
  | "soft"
  | "light"
  | "medium"
  | "success"
  | "warning"
  | "error"
  | "none";

export const HAPTIC_MIN_INTERVAL_MS = 80;
