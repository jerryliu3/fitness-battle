"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { competitionMomentScene, sportById, type CompetitionMoment as Moment } from "@fitness-battle/shared";
import { ArenaLanes } from "@/features/focus/arena-lanes";
import { useFieldAppearance } from "@/features/field/components/field-course";
import { useAuth } from "@/components/auth-context";
import { playCue } from "@/lib/haptics";
const ignore = () => {};

export function CompetitionMoment({ moment, remaining, onConfirm, debug = false }: { moment: Moment; remaining: number; onConfirm: () => void; debug?: boolean }) {
  const { user } = useAuth();
  const [appearance] = useFieldAppearance(user?.id ?? "guest", moment.sport);
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const previousCount = useRef(0), skipped = useRef(false), confirmed = useRef(false);
  const passedBy = !moment.plan.hasOvertake;
  const count = passedBy ? moment.plan.passedByIds?.length ?? 0 : moment.plan.overtakenIds.length;
  useEffect(() => {
    if (reduced) { setProgress(1); return; }
    let raf = 0;
    setProgress(0);
    const start = performance.now();
    const duration = 4200 + count * 1150;
    const tick = (now: number) => { if (skipped.current) return; const p = Math.min(1, (now - start) / duration); setProgress(p); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [moment.id, reduced, count]);
  const frame = competitionMomentScene(moment, progress);
  useEffect(() => {
    if (frame.count > previousCount.current && !passedBy && !reduced) void playCue("success");
    previousCount.current = frame.count;
  }, [frame.count, passedBy, reduced]);
  return <div className="moment-replay" aria-label="Field movement replay">
    <div className="moment-replay-field" inert>
      <ArenaLanes immersive focusOnMount followSelected lanes={frame.lanes} appearance={appearance} view={frame.view} unit={moment.unit} selected={moment.plan.youId} onSelect={ignore} onPan={ignore}/>
    </div>
    <header className="moment-replay-top">
      <div className="moment-replay-label"><span className="fb-kicker">{sportById(moment.sport).name} · REPLAY</span>{debug && <small>DEBUG PREVIEW · LOCAL DATA ONLY</small>}</div>
      <div className="moment-replay-standings" aria-label="Live replay standings">{frame.standings.map(lane => <div key={lane.id} className={lane.you ? "is-you" : ""}><b>#{lane.place}</b><span>{lane.you ? "You" : lane.name}</span><small>{lane.value.toFixed(1)} {moment.unit}</small></div>)}</div>
    </header>
    <footer className="moment-replay-bottom">
      <div className="moment-replay-feedback" role="status" aria-live="polite" aria-atomic="true">
        <strong>{frame.count} <span>{passedBy ? "passed you" : `overtake${frame.count === 1 ? "" : "s"}`}</span></strong>
        {!passedBy && frame.count > 1 && <b>×{frame.count} COMBO</b>}
        <small>Your place #{frame.rank}{frame.done ? " · Up to date" : " · Replaying your field"}</small>
      </div>
      <button className="fb-btn" type="button" onClick={() => frame.done ? (() => { if (!confirmed.current) { confirmed.current = true; onConfirm(); } })() : (() => { skipped.current = true; setProgress(1); })()}>{frame.done ? remaining > 1 ? "Continue →" : "Back to the app →" : "Skip animation"}</button>
    </footer>
  </div>;
}
