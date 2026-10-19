"use client";

import {
  readArenaScoreTrack,
  writeArenaScoreTrack,
  type ScoreTrack,
} from "@fitness-battle/shared";
import { useCallback, useState } from "react";

export function useScoreTrackLens(): [ScoreTrack, (next: ScoreTrack) => void] {
  const [track, setTrack] = useState<ScoreTrack>(() => {
    if (typeof window === "undefined") return "open";
    return readArenaScoreTrack(localStorage);
  });

  const choose = useCallback((next: ScoreTrack) => {
    setTrack(next);
    if (typeof window !== "undefined") {
      writeArenaScoreTrack(localStorage, next);
    }
  }, []);

  return [track, choose];
}
