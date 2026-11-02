"use client";
import { typographyStyle } from "@/ui/section";
import { useCompetitionCourse } from "@/features/course/use-competition-course";
import { useCompete } from "@/components/compete-context";
import { GeographicCourse } from "@/features/course/geographic-course";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { DEMO_RACE_COURSE, competitionMomentScene, competePeriodWindow, sportById, type RaceCourse, type CompetitionMoment as Moment } from "@fitness-battle/shared";
import { ArenaLanes } from "@/features/focus/arena-lanes";
import { useFieldAppearance } from "@/features/field/components/field-course";
import { useAuth } from "@/components/auth-context";
import { playCue } from "@/lib/haptics";
const ignore = () => {};

export function CompetitionMoment({ moment, remaining, onConfirm, debug = false, embedded = false, dimension = moment.unit === "pts" ? "2d" : "4d", course = null, autoStart = false }: { moment: Moment; remaining: number; onConfirm: () => void; debug?: boolean; embedded?: boolean; dimension?: "2d" | "4d"; course?: RaceCourse | null; autoStart?: boolean }) {
  const { user } = useAuth();
  const { state } = useCompete();
  const period = state ? competePeriodWindow(state, undefined, moment.sport) : null;
  const [appearance] = useFieldAppearance(user?.id ?? "guest", moment.sport);
  const reduced = useReducedMotion();
  const [viewDimension,setViewDimension]=useState(dimension);
  useEffect(()=>setViewDimension(dimension),[dimension]);
  const assigned = useCompetitionCourse(moment.sport, moment.periodStart ?? period?.startsAt.toISOString() ?? "", moment.periodEnd ?? period?.endsAt.toISOString() ?? "", debug, !course && viewDimension === "4d");
  const [sceneReady, setSceneReady] = useState(false);
  useEffect(() => setSceneReady(false), [viewDimension]);
  const [started, setStarted] = useState(autoStart);
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const previousCount = useRef(0), skipped = useRef(false), confirmed = useRef(false);
  const passedBy = !moment.plan.hasOvertake && Boolean(moment.plan.passedByIds?.length);
  const count = passedBy ? moment.plan.passedByIds?.length ?? 0 : moment.plan.overtakenIds.length;
  useEffect(() => {
    if (reduced) { setProgress(1); return; }
    if (skipped.current) return;
    if (!started || (viewDimension === "4d" && !sceneReady)) return;
    let raf = 0;
    setProgress(0);
    const start = performance.now();
    const duration = (4200 + count * 1150) * (embedded ? 1.5 : 1);
    const tick = (now: number) => { if (skipped.current) return; const p = Math.min(1, (now - start) / duration); setProgress(p); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [moment.id, reduced, count, started, embedded, viewDimension, sceneReady]);
  const frame = competitionMomentScene(moment, progress);
  useEffect(() => {
    if (frame.count > previousCount.current && !passedBy && !reduced) void playCue("success");
    previousCount.current = frame.count;
  }, [frame.count, passedBy, reduced]);
  return <div style={embedded ? {position:"relative",height:600,overflow:"hidden",borderRadius:20} : undefined} className="moment-replay" aria-label="Field movement replay">
    <div className="moment-replay-field" style={embedded ? {top:0,bottom:80} : undefined}>
      {viewDimension === "4d" ? <GeographicCourse course={course ?? assigned.course ?? (debug?DEMO_RACE_COURSE:null)} error={assigned.error} onRetry={assigned.retry} onReady={() => setSceneReady(true)} replay={frame} lanes={frame.lanes} unit={moment.unit} selectedId={moment.plan.youId} focusRequest={0} onSelect={ignore}/> : <ArenaLanes playback replayFocusIds={frame.replayFocusIds} immersive focusOnMount followSelected lanes={frame.lanes} appearance={appearance} view={frame.view} unit={moment.unit} selected={moment.plan.youId} onSelect={ignore} onPan={ignore}/>}
    </div>
    <header className="moment-replay-top">{debug&&!embedded&&<div style={{pointerEvents:"auto",display:"flex",gap:8}}>{(["2d","4d"] as const).map(mode=><button type="button" className="fb-chip" aria-pressed={viewDimension===mode} key={mode} onClick={()=>setViewDimension(mode)}>{mode==="4d"?"3D course":"2D field"}</button>)}</div>}
      {!embedded && <div className="moment-replay-label"><span className="fb-kicker">{sportById(moment.sport).name} · {embedded ? "OVERTAKE TUTORIAL · SAMPLE KM" : "REPLAY"}</span>{debug && <small>DEBUG PREVIEW · LOCAL DATA ONLY</small>}</div>}
      {!embedded && <div className="moment-replay-standings" aria-label="Live replay standings">{frame.standings.map(lane => <div key={lane.id} className={lane.you ? "is-you" : ""}><b>#{lane.place}</b><span>{lane.you ? "You" : lane.name}</span><small>{lane.value.toFixed(1)} {moment.unit}</small></div>)}</div>}
    </header>
    {moment.plan.hasOvertake && frame.count > 0 && <div className="moment-replay-label" role="status" style={{position:"absolute",left:16,top:100}}>{frame.count} overtake{frame.count === 1 ? "" : "s"}</div>}
    {!moment.plan.hasOvertake && !passedBy && <div className="moment-replay-label" role="status" style={{position:"absolute",left:16,top:100}}>+{(moment.plan.youAfter - moment.plan.youBefore).toFixed(moment.unit === "pts" ? 0 : 1)} {moment.unit}</div>}
    {!reduced && !skipped.current && frame.passEffects.length > 0 && <div aria-hidden style={{position:"absolute",top:"45%",left:"50%",transform:"translateX(-50%)",...typographyStyle("hero"),color:"#f7c948",opacity:Math.max(...frame.passEffects.map(pass=>pass.strength)),pointerEvents:"none"}}>+1</div>}
    <footer className="moment-replay-bottom">
      <button className="fb-btn" type="button" onClick={() => !started && !reduced ? setStarted(true) : frame.done ? (() => { if (!confirmed.current) { confirmed.current = true; onConfirm(); } })() : (() => { skipped.current = true; setProgress(1); })()}>{!started && !reduced ? embedded ? "Watch an Overtake →" : "See my move →" : frame.done ? remaining > 1 ? "Continue →" : embedded ? "Replay Overtake →" : "Back to the app →" : "Skip animation"}</button>
    </footer>
  </div>;
}
