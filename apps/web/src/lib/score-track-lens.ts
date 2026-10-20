"use client";

import {
  readArenaScoreTrack,
  writeArenaScoreTrack,
  type ScoreTrack,
} from "@fitness-battle/shared";
import { useCallback, useEffect, useRef, useState } from "react";

export function useScoreTrackLens(): [ScoreTrack, (next: ScoreTrack) => void] {
  const [track, setTrack] = useState<ScoreTrack>("open");
  const chosen = useRef(false);
  useEffect(() => {
    if (chosen.current) return;
    try { setTrack(readArenaScoreTrack(window.localStorage)); } catch { /* Storage is optional. */ }
  }, []);

  const choose = useCallback((next: ScoreTrack) => {
    chosen.current = true;
    setTrack(next);
    if (typeof window !== "undefined") {
      try { writeArenaScoreTrack(window.localStorage, next); } catch { /* Storage is optional. */ }
    }
  }, []);

  return [track, choose];
}
