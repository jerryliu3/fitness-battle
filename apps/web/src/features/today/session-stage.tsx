"use client";
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
    <p className="fb-kicker">{model.sessions?`${model.sessions} recorded session${model.sessions===1?"":"s"}`:"Today's suggestion"}</p>
    <h1>{model.sessions?"Time well spent.":suggestion?.title??"Make room to move."}</h1>
    <div className="session-stage-object"><div><span className="session-stage-hours">{formatTrainingHours(seconds)}<small> hr</small></span><span className="fb-note">{model.sessions?"Moving time":"Suggested time"}</span></div><AnimatedEmber expression="happy" action={model.sessions?"celebrate":"idle"} loop={false} /></div>
    {model.sessions?<div className="club-session-metrics">{clubSessionMetrics(model.rows,state.units).map(metric=><div key={metric.label}><strong>{metric.value}</strong><small>{metric.label}</small></div>)}</div>:null}
    {!model.sessions?<><p className="fb-copy">{suggestion?.detail??"Nothing recorded today."}</p>{actions}</>:<>
      <div className="session-stage-list">{model.rows.map(a=><details key={a.id} className="session-stage-row"><summary><span><b>{sportById(a.sport).name}</b><small>{new Date(a.startedAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:APP_TIMEZONE})}</small></span><strong>{formatTrainingHours(a.movingSec)} hr</strong></summary><div>
        <p className="fb-note">{a.source} · {a.verified?"GPS Tracked":a.source==="manual"?"Manual":"Activity"}{sportById(a.sport).gps?` · ${formatVolume(a.sport,a.distanceM,a.movingSec,state.units)}`:""}{a.avgHr?` · ${a.avgHr} bpm`:""}</p>
        {removing===a.id?<div className="session-remove-confirm"><p>Remove this session from your activity?</p><button type="button" className="fb-btn-line" onClick={()=>{onRemove(a.id);setRemoving(null);}}>Remove session</button><button type="button" className="fb-btn-ghost" onClick={()=>setRemoving(null)}>Keep session</button></div>:<button type="button" className="fb-btn-ghost" onClick={()=>setRemoving(a.id)}>Remove session</button>}
      </div></details>)}</div>
      <ImpactReceipt state={state} seconds={model.movingSec} sport={sport}/>
    </>}
  </section>;
}
