import type { ScoreTrack } from "./compete/sports";

const KEY = "fb:score-track-lens";

export type ScoreTrackLens = Record<"open" | "verified", ScoreTrack>;

const DEFAULT_LENS: ScoreTrackLens = { open: "open", verified: "verified" };

/** Persist Open vs GPS verified lens (not per-sport until sport switching is wired). */
export function readScoreTrackLens(
  storage: Pick<Storage, "getItem"> | null,
): ScoreTrackLens {
  if (!storage) return DEFAULT_LENS;
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return DEFAULT_LENS;
    const parsed = JSON.parse(raw) as Partial<ScoreTrackLens>;
    return {
      open: parsed.open === "verified" ? "verified" : "open",
      verified: parsed.verified === "open" ? "open" : "verified",
    };
  } catch {
    return DEFAULT_LENS;
  }
}

export function writeScoreTrackLens(
  storage: Pick<Storage, "setItem"> | null,
  lens: ScoreTrackLens,
): void {
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify(lens));
  } catch {
    /* optional */
  }
}

export function scoreTrackFromLens(
  lens: ScoreTrackLens,
  track: ScoreTrack,
): ScoreTrack {
  return track === "verified" ? lens.verified : lens.open;
}
