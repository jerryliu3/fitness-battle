"use client";
import { GeographicCourse } from "@/features/course/geographic-course";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { DEMO_RACE_COURSE, competitionMomentScene, sportById, type RaceCourse, type CompetitionMoment as Moment } from "@fitness-battle/shared";
import { ArenaLanes } from "@/features/focus/arena-lanes";
import { useFieldAppearance } from "@/features/field/components/field-course";
import { useAuth } from "@/components/auth-context";
import { playCue } from "@/lib/haptics";
const ignore = () => {};

export function CompetitionMoment({ moment, remaining, onConfirm, debug = false, embedded = false, dimension = "2d", course = null, autoStart = false }: { moment: Moment; remaining: number; onConfirm: () => void; debug?: boolean; embedded?: boolean; dimension?: "2d" | "4d"; course?: RaceCourse | null; autoStart?: boolean }) {
  const { user } = useAuth();
  const [appearance] = useFieldAppearance(user?.id ?? "guest", moment.sport);
  const reduced = useReducedMotion();
  const [viewDimension,setViewDimension]=useState(dimension);
  useEffect(()=>setViewDimension(dimension),[dimension]);
  const [started, setStarted] = useState(autoStart);
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const previousCount = useRef(0), skipped = useRef(false), confirmed = useRef(false);
  const passedBy = !moment.plan.hasOvertake;
  const count = passedBy ? moment.plan.passedByIds?.length ?? 0 : moment.plan.overtakenIds.length;
  useEffect(() => {
    if (reduced) { setProgress(1); return; }
    if (!started) return;
    let raf = 0;
    setProgress(0);
    const start = performance.now();
    const duration = (4200 + count * 1150) * (embedded ? 1.5 : 1);
    const tick = (now: number) => { if (skipped.current) return; const p = Math.min(1, (now - start) / duration); setProgress(p); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [moment.id, reduced, count, started, embedded]);
  const frame = competitionMomentScene(moment, progress);
  useEffect(() => {
    if (frame.count > previousCount.current && !passedBy && !reduced) void playCue("success");
    previousCount.current = frame.count;
  }, [frame.count, passedBy, reduced]);
  return <div style={embedded ? {position:"relative",height:600,overflow:"hidden",borderRadius:20} : undefined} className="moment-replay" aria-label="Field movement replay">
    <div className="moment-replay-field" style={embedded ? {top:0,bottom:160} : undefined} inert>
      {viewDimension === "4d" ? <GeographicCourse course={course ?? (debug?DEMO_RACE_COURSE:null)} lanes={frame.lanes} unit={moment.unit} selectedId={moment.plan.youId} focusRequest={0} onSelect={ignore}/> : <ArenaLanes playback replayFocusIds={frame.replayFocusIds} immersive focusOnMount followSelected lanes={frame.lanes} appearance={appearance} view={frame.view} unit={moment.unit} selected={moment.plan.youId} onSelect={ignore} onPan={ignore}/>}
    </div>
    <header className="moment-replay-top">{debug&&!embedded&&<div style={{pointerEvents:"auto",display:"flex",gap:8}}>{(["2d","4d"] as const).map(mode=><button type="button" className="fb-chip" aria-pressed={viewDimension===mode} key={mode} onClick={()=>setViewDimension(mode)}>{mode==="4d"?"4D course":"2D field"}</button>)}</div>}
      {!embedded && <div className="moment-replay-label"><span className="fb-kicker">{sportById(moment.sport).name} · {embedded ? "OVERTAKE TUTORIAL · SAMPLE KM" : "REPLAY"}</span>{debug && <small>DEBUG PREVIEW · LOCAL DATA ONLY</small>}</div>}
      {!embedded && <div className="moment-replay-standings" aria-label="Live replay standings">{frame.standings.map(lane => <div key={lane.id} className={lane.you ? "is-you" : ""}><b>#{lane.place}</b><span>{lane.you ? "You" : lane.name}</span><small>{lane.value.toFixed(1)} {moment.unit}</small></div>)}</div>}
    </header>
    <footer className="moment-replay-bottom">
      <div className="moment-replay-feedback" role="status" aria-live="polite" aria-atomic="true">
        <small>{!started && !reduced ? "Your field has moved." : frame.done ? passedBy ? "Your field, up to date." : "Look at you go." : frame.focus > .3 ? "Slow motion · the Overtake" : "The Overtake"}</small>
        <strong>{frame.count} <span>{passedBy ? "passed you" : `overtake${frame.count === 1 ? "" : "s"}`}</span></strong>
        {!passedBy && frame.count > 1 && <b>×{frame.count} COMBO</b>}
        <small>Your place #{frame.rank}{frame.done ? " · Up to date" : " · Replaying your field"}</small>
      </div>
      <button className="fb-btn" type="button" onClick={() => !started && !reduced ? setStarted(true) : frame.done ? (() => { if (!confirmed.current) { confirmed.current = true; onConfirm(); } })() : (() => { skipped.current = true; setProgress(1); })()}>{!started && !reduced ? embedded ? "Watch an Overtake →" : "See my move →" : frame.done ? remaining > 1 ? "Continue →" : embedded ? "Replay Overtake →" : "Back to the app →" : "Skip animation"}</button>
    </footer>
  </div>;
}
