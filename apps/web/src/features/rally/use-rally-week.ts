"use client";

import {
  competeNow,
  type CompeteState,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { useEffect, useMemo, useState } from "react";
import {
  buildRallyBoard,
  resolveReference,
  snapshotAfterMove,
  snapshotAt,
  type RallyBoard,
  type RallyCutoff,
  type RallyMove,
} from "./model";

function useRallyReplay(rally: RallyBoard | null) {
  const [cutoff, setCutoff] = useState<RallyCutoff>(3);
  const [referenceId, setReferenceId] = useState("ghost");
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      setCutoff(step as RallyCutoff);
      if (step >= 3) {
        window.clearInterval(timer);
        setPlaying(false);
      }
    }, 1250);
    return () => window.clearInterval(timer);
  }, [playing]);

  if (!rally) return null;

  const reference = resolveReference(rally, referenceId);
  const week = snapshotAt(rally, reference, cutoff);

  return {
    rally,
    cutoff,
    reference,
    week,
    playing,
    setCutoff: (next: RallyCutoff) => {
      setCutoff(next);
      setPlaying(false);
    },
    setReference: (id: string) => {
      setReferenceId(id);
      setPlaying(false);
    },
    onReplay: () => {
      if (playing) {
        setPlaying(false);
        return;
      }
      setCutoff(0);
      setPlaying(true);
    },
    receiptFor: (move: RallyMove) => {
      const index = rally.moves.findIndex((item) => item.id === move.id);
      return snapshotAfterMove(rally, reference, Math.max(0, index));
    },
  };
}

/** Shared Rally accents: board model + personal-matchup replay state. */
export function useRallyPresentation(
  state: CompeteState | null,
  sport: SportId,
  track: ScoreTrack,
  enabled: boolean,
) {
  const rally = useMemo(() => {
    if (!enabled || !state) return null;
    return buildRallyBoard(state, sport, track, competeNow(state));
  }, [enabled, state, sport, track]);

  return useRallyReplay(rally);
}
