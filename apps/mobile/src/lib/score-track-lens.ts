import { competitionTrack, type ScoreTrack } from "@fitness-battle/shared";
import { useCompeteStore } from "./compete-store";

/** The primary sport controls the score lens; it is no longer a device preference. */
export function useScoreTrackLens(): [ScoreTrack] {
  const { state } = useCompeteStore();
  return [competitionTrack(state?.primary ?? "running")];
}
