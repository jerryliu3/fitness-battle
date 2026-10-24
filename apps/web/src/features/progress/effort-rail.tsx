"use client";
import { AppText, AppParagraph } from "@/ui/section";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { competitionTrack, competitionTrackLabel, effortPointProgress, formatVolume, rankForElo, sportById, type CompeteState } from "@fitness-battle/shared";
import { useCompete } from "@/components/compete-context";
import { useAuth } from "@/components/auth-context";

export function EffortRail({ compact = false }: { compact?: boolean }) {
  const { state, loadStatus, saveError }=useCompete();
  const { user }=useAuth();
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
  const remaining=formatVolume(model.sport,model.sport==="strength"?0:model.remaining,model.sport==="strength"?model.remaining:0,state.units);
  return <Link className={`effort-rail${compact ? " effort-rail-compact" : ""}`} href="/you?view=effort#effort-score" aria-label={`${sportById(model.sport).name} ${competitionTrackLabel(model.sport)} Effort Score ${model.score}. ${model.capped?"Maximum score":`${remaining} to the next point`}`}>
    <span className="effort-rail-top"><span>{sportById(model.sport).name} · {rankForElo(model.score).name}</span><strong>{model.score.toLocaleString()} <AppText as="small" role="caption" secondary>Effort Score</AppText></strong></span>
    <span className="effort-rail-track" role="progressbar" aria-label="Progress to next Effort Score point" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(model.fraction*100)}><motion.span initial={false} animate={{scaleX:model.fraction,scaleY:gain&&!reduced?[1,1.6,1]:1}} transition={{duration:reduced?0:.65}} /><AppText as="small" role="caption" secondary className="effort-rail-remaining">{model.capped?"Maximum score":`${remaining} left`}</AppText></span>
    <span className="effort-rail-caption"><span>{saveError?"Changes not saved":`${model.earned?`${competitionTrackLabel(model.sport)} · +${model.earned} this week`:competitionTrackLabel(model.sport)}`}</span></span>
    {gain>0&&<span className="effort-rail-gain" role="status" key={`${model.score}:${gain}`}>+{gain}{!reduced&&<span className="effort-stars" aria-hidden="true">✦ ✧ ✦</span>}</span>}
  </Link>;
}

export function ImpactReceipt({state,seconds,sport}:{state:CompeteState;seconds:number;sport:CompeteState["primary"]}){
  const model=effortPointProgress(state,sport,competitionTrack(sport));
  return <details className="session-impact"><summary>What this added <span>↗</span></summary><div>
    <AppParagraph typographyRole="body"><b>{(seconds/3600).toLocaleString("en-US",{maximumFractionDigits:2})} hr</b> of recorded activity</AppParagraph>
    {model&&<AppParagraph typographyRole="body">{sportById(sport).name} · {competitionTrackLabel(sport)} <b>+{model.earned} from activity this week</b></AppParagraph>}
    {model&&!model.capped&&<AppText as="small" role="caption" secondary>{formatVolume(sport,sport==="strength"?0:model.remaining,sport==="strength"?model.remaining:0,state.units)} to the next Effort Score point</AppText>}
    {model?.retained&&<AppText as="small" role="caption" secondary>Previously earned points are kept when a session is removed.</AppText>}
  </div></details>;
}
