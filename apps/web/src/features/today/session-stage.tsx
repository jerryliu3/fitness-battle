"use client";
import { ActivityRoute } from "@/components/routes/activity-route";
import { AppParagraph, AppText, AppHeading } from "@/ui/section";

import { useState, type ReactNode } from "react";
import { APP_TIMEZONE, clubSessionMetrics, countsOnTrack, isVerifiedActivity, formatTrainingHours, formatVolume, sessionStageModel, sportById, type Activity, type CompeteState } from "@fitness-battle/shared";
import { AnimatedEmber } from "@/components/mascot/animated-ember";
import { ImpactReceipt } from "@/features/progress/effort-rail";

export function SessionStage({state,activities,suggestion,onRemove,actions}:{state:CompeteState;activities:Activity[];suggestion?:{title:string;minutes?:number|null;detail:string};onRemove:(id:string)=>void;actions?:ReactNode}){
  const model=sessionStageModel(activities);
  const [removing,setRemoving]=useState<string|null>(null);
  const sport=model.rows[0]?.sport??state.primary;
  const seconds=model.sessions?model.movingSec:(suggestion?.minutes??0)*60;
  return <section className="session-stage" aria-label={model.sessions?"Recorded sessions":"Today's suggestion"}>
    {model.sessions?<div className="club-session-meta"><span className="club-status-badge">{model.rows.every(a=>isVerifiedActivity(a))?"✓ GPS Tracked":"Activity"}{model.rows.every(a=>countsOnTrack(a,"open"))?"":" · Excluded"}</span><span className="fb-note">{new Date(model.rows[0]!.startedAt).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:APP_TIMEZONE})}</span></div>:null}
    <AppParagraph typographyRole="badgeLabel" className="fb-kicker">{model.sessions?`${model.sessions} recorded session${model.sessions===1?"":"s"}`:"Today's suggestion"}</AppParagraph>
    <AppHeading level={1} role="pageTitle">{model.sessions?"Time well spent.":suggestion?.title??"Make room to move."}</AppHeading>
    <div className="session-stage-object"><div><span className="session-stage-hours">{formatTrainingHours(seconds)}<AppText as="small" role="caption" secondary> hr</AppText></span><span className="fb-note">{model.sessions?"Moving time":"Suggested time"}</span></div><AnimatedEmber expression="happy" action={model.sessions?"celebrate":"idle"} loop={false} /></div>
    {model.sessions?<div className="club-session-metrics">{clubSessionMetrics(model.rows,state.units).map(metric=><div key={metric.label}><strong>{metric.value}</strong><AppText as="small" role="caption" secondary>{metric.label}</AppText></div>)}</div>:null}
    {!model.sessions?<><AppParagraph typographyRole="body" className="fb-copy">{suggestion?.detail??"Nothing recorded today."}</AppParagraph>{actions}</>:<>
      <div className="session-stage-list">{model.rows.map(a=><details key={a.id} className="session-stage-row"><summary><span><b>{sportById(a.sport).name}</b><AppText as="small" role="caption" secondary>{new Date(a.startedAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:APP_TIMEZONE})}</AppText></span><strong>{formatTrainingHours(a.movingSec)} hr</strong></summary><div>
        <AppParagraph typographyRole="caption" className="fb-note">{a.source} · {a.verified?"GPS Tracked":a.source==="manual"?"Manual":"Activity"}{sportById(a.sport).gps?` · ${formatVolume(a.sport,a.distanceM,a.movingSec,state.units)}`:""}{a.avgHr?` · ${a.avgHr} bpm`:""}</AppParagraph>
        {removing===a.id?<div className="session-remove-confirm"><AppParagraph typographyRole="body">Remove this session from your activity?</AppParagraph><button type="button" className="fb-btn-line" onClick={()=>{onRemove(a.id);setRemoving(null);}}>Remove session</button><button type="button" className="fb-btn-ghost" onClick={()=>setRemoving(null)}>Keep session</button></div>:<button type="button" className="fb-btn-ghost" onClick={()=>setRemoving(a.id)}>Remove session</button>}
      </div></details>)}</div>
      <div className="fb-stack">{model.rows.map(a => <ActivityRoute units={state.units} key={a.id} activity={a} />)}</div>
      <ImpactReceipt state={state} seconds={model.movingSec} sport={sport}/>
    </>}
  </section>;
}
