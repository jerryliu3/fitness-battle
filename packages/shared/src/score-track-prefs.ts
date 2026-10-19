import type { ScoreTrack } from "./compete/sports";

const KEY = "fb:arena-score-track";

type KeyValueRead = { getItem(key: string): string | null };
type KeyValueWrite = { setItem(key: string, value: string): void };

/** Remember Open vs GPS verified lens across sessions. */
export function readArenaScoreTrack(
  storage: KeyValueRead | null,
): ScoreTrack {
  if (!storage) return "open";
  try {
    const raw = storage.getItem(KEY);
    return raw === "verified" ? "verified" : "open";
  } catch {
    return "open";
  }
}

export function writeArenaScoreTrack(
  storage: KeyValueWrite | null,
  track: ScoreTrack,
): void {
  if (!storage) return;
  try {
    storage.setItem(KEY, track);
  } catch {
    /* optional */
  }
}
