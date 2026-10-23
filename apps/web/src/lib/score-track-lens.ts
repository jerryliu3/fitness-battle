"use client";
import { competitionTrack, type ScoreTrack } from "@fitness-battle/shared";
import { useCompete } from "@/components/compete-context";

/** The primary sport controls the score lens; it is no longer a device preference. */
export function useScoreTrackLens(): [ScoreTrack] {
  const { state } = useCompete();
  return [competitionTrack(state?.primary ?? "running")];
}
