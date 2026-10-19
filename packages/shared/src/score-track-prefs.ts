import type { ScoreTrack } from "./compete/sports";

const KEY = "fb:arena-score-track";

/** Remember Open vs GPS verified lens across sessions. */
export function readArenaScoreTrack(
  storage: Pick<Storage, "getItem"> | null,
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
  storage: Pick<Storage, "setItem"> | null,
  track: ScoreTrack,
): void {
  if (!storage) return;
  try {
    storage.setItem(KEY, track);
  } catch {
    /* optional */
  }
}
