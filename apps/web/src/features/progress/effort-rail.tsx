"use client";
import { activeMultiplier, endOfZonedDay } from "@fitness-battle/shared";
import { AppText, AppParagraph } from "@/ui/section";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { competitionTrack, competitionTrackLabel, effortPointProgress, formatEffortScore, formatVolume, rankForElo, sportById, type CompeteState } from "@fitness-battle/shared";
import { useCompete } from "@/components/compete-context";
import { webEnv } from "@/lib/env";
import { useAuth } from "@/components/auth-context";

function EffortHeaderControls({ score, fraction, remaining, boost, gain, reduced }: {
  score: number;
  fraction: number;
  remaining: string;
  boost: ReturnType<typeof activeMultiplier>;
  gain: number;
  reduced: boolean;
}) {
  const [open, setOpen] = useState<"progress" | "boost" | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLButtonElement>(null);
  const multiplier = useRef<HTMLButtonElement>(null);
  const popupId = useId();
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(null);
      (open === "boost" ? multiplier : progress).current?.focus();
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const days = boost ? Math.ceil((boost.endsAt.getTime() - Date.now()) / 86_400_000) : 0;
  return (
    <div className="effort-header-controls" ref={root}>
      <div className="effort-header-progress">
        <Link className="effort-header-score" href="/you?view=effort#effort-score">
          <AppText role="value">{formatEffortScore(score)} <AppText as="small" role="caption" secondary>Effort Score</AppText></AppText>
        </Link>
        <button ref={progress} type="button" className="effort-rail-track effort-header-track"
          aria-label="Show progress to next rank" aria-expanded={open === "progress"}
          aria-controls={open === "progress" ? popupId : undefined}
          onClick={() => setOpen(open === "progress" ? null : "progress")}>
          <span aria-hidden="true" style={{ width: `${fraction * 100}%` }} />
        </button>
        {gain > 0 && <span className="effort-rail-gain" role="status" key={`${score}:${gain}`}>+{gain}{!reduced && <span className="effort-stars" aria-hidden="true">✦ ✧ ✦</span>}</span>}
        {open === "progress" && <div className="effort-header-popup" id={popupId}>{remaining}</div>}
      </div>
      {boost && <div className="effort-header-boost">
        <button ref={multiplier} type="button" className="effort-multiplier"
          aria-label={`${boost.label} Effort Boost`} aria-expanded={open === "boost"}
          aria-controls={open === "boost" ? popupId : undefined}
          onClick={() => setOpen(open === "boost" ? null : "boost")}>
          {boost.label.replace("×", "x")} boost
        </button>
        {open === "boost" && <div className="effort-header-popup" id={popupId}>{days} {days === 1 ? "day" : "days"} left</div>}
      </div>}
    </div>
  );
}

export function EffortRail({ compact = false }: { compact?: boolean }) {
  const { state, loadStatus, saveError }=useCompete();
  const { user }=useAuth();
  const [,refreshClock]=useState(0);
  useEffect(()=>{
    let timer:ReturnType<typeof setTimeout>;
    const schedule=()=>{timer=setTimeout(()=>{refreshClock(value=>value+1);schedule();},Math.max(1,endOfZonedDay(new Date()).getTime()-Date.now()));};
    schedule();return()=>clearTimeout(timer);
  },[]);
  const model=state?effortPointProgress(state,state.primary,competitionTrack(state.primary)):null;
  const reduced=useReducedMotion();
  const previous=useRef<{scope:string;score:number}|null>(null);
  const [gain,setGain]=useState(0);
  const scope=`${user?.id ?? "guest"}:${state?.primary}:${state ? competitionTrack(state.primary) : "open"}`;
  const ready=loadStatus==="ready"||loadStatus==="local";
  useEffect(()=>{
    if(!ready||!model){previous.current=null;setGain(0);return;}
    const last=previous.current;
    previous.current={scope,score:model.score};
    setGain(last?.scope===scope&&!saveError?Math.max(0,model.score-last.score):0);
    const timer=window.setTimeout(()=>setGain(0),1500);
    return()=>window.clearTimeout(timer);
  },[scope,model?.score,ready,saveError]);
  if(!state||!model||!ready)return null;
  const now = new Date();
  const boost = activeMultiplier(state.effortAccounts?.[state.primary]?.starter ??
    (webEnv.previewEffortBoost ? {
      multiplier: 3,
      startsAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
      boostEndsAt: new Date(now.getTime() + 25 * 86400000).toISOString(),
    } : undefined), now);
  const remaining=model.live ? `${model.remaining} points` : formatVolume(model.sport,model.sport==="strength"?0:model.remaining,model.sport==="strength"?model.remaining:0,state.units);
  if (compact) return <EffortHeaderControls score={model.score} fraction={model.fraction}
    remaining={model.capped ? "Maximum score" : `${remaining} to the next rank`} boost={boost} gain={gain} reduced={Boolean(reduced)} />;
  return <Link className="effort-rail" href="/you?view=effort#effort-score" aria-label={`${sportById(model.sport).name} ${competitionTrackLabel(model.sport)} Effort Score ${model.score}. ${model.capped?"Maximum score":`${remaining} to the next rank`}`}>
    <span className="effort-rail-top"><span>{sportById(model.sport).name} · {model.officialRank ?? rankForElo(model.score).name}</span><AppText role="value">{formatEffortScore(model.score)} <AppText as="small" role="caption" secondary>Effort Score</AppText></AppText></span>
    <span className="effort-rail-track" role="progressbar" aria-label="Progress to next rank" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(model.fraction*100)}><motion.span initial={false} animate={{scaleX:model.fraction,scaleY:gain&&!reduced?[1,1.6,1]:1}} transition={{duration:reduced?0:.65}} /><AppText as="small" role="caption" secondary className="effort-rail-remaining">{model.capped?"Maximum score":`${remaining} left`}</AppText></span>
    <span className="effort-rail-caption"><span>{`${model.live ? "Live · " : ""}${model.earned?`${competitionTrackLabel(model.sport)} · +${model.earned} this week`:competitionTrackLabel(model.sport)}`}</span></span>
    {gain>0&&<span className="effort-rail-gain" role="status" key={`${model.score}:${gain}`}>+{gain}{!reduced&&<span className="effort-stars" aria-hidden="true">✦ ✧ ✦</span>}</span>}
  </Link>;
}

export function ImpactReceipt({state,seconds,sport,title="What this added"}:{state:CompeteState;seconds:number;sport:CompeteState["primary"];title?:string}){
  const model=effortPointProgress(state,sport,competitionTrack(sport));
  return <details className="session-impact"><summary>{title} <span>↗</span></summary><div>
    <AppParagraph typographyRole="body"><b>{(seconds/3600).toLocaleString("en-US",{maximumFractionDigits:2})} hr</b> of recorded activity</AppParagraph>
    {model&&<AppParagraph typographyRole="body">{sportById(sport).name} · {competitionTrackLabel(sport)} <b>+{model.earned} from activity this week</b></AppParagraph>}
    {model&&!model.capped&&<AppText as="small" role="caption" secondary>{formatVolume(sport,sport==="strength"?0:model.remaining,sport==="strength"?model.remaining:0,state.units)} to the next rank</AppText>}
    {model?.retained&&<AppText as="small" role="caption" secondary>Score updates reflect eligible recorded activity.</AppText>}
  </div></details>;
}
