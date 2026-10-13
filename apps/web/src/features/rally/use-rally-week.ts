"use client";

import { useEffect, useState } from "react";
import type { RallyBoard, RallyCutoff, RallyMove, RallyReference } from "./model";
import {
  resolveReference,
  snapshotAfterMove,
  snapshotAt,
} from "./model";

export function useRallyWeek(rally: RallyBoard | null) {
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

  if (!rally) {
    return null;
  }

  const reference = resolveReference(rally, referenceId);
  const week = snapshotAt(rally, reference, cutoff);

  return {
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
      if (playing) setPlaying(false);
      else {
        setCutoff(0);
        setPlaying(true);
      }
    },
    receiptFor: (move: RallyMove) => {
      const index = rally.moves.findIndex((item) => item.id === move.id);
      return snapshotAfterMove(rally, reference, Math.max(0, index));
    },
    allReferences: [
      reference.ghost
        ? reference
        : ({
            id: "ghost",
            name: "Your previous week",
            initials: "PW",
            ghost: true,
          } satisfies RallyReference),
      ...rally.lanes.filter((lane) => !lane.you),
    ].filter(
      (item, index, list) => list.findIndex((row) => row.id === item.id) === index,
    ),
  };
}
