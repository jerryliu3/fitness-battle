"use client";
import { useState } from "react";
import { APP_TIMEZONE, formatWeeklyCompetitionRange, weeklyPeriodBounds, SPORTS, competeNow, dayKey, formatTrainingHours, shiftAppDay, shiftTrainingMonth, sportById, trainingAtlas, trainingBuckets, type CompeteState, type SportId, type TrainingRange } from "@fitness-battle/shared";
export function TrainingAtlas({state}:{state:CompeteState}){
  const now=competeNow(state);
  const [sport,setSport]=useState<SportId|"all">("all"),[range,setRange]=useState<TrainingRange>("week"),[anchor,setAnchor]=useState(()=>now),[selected,setSelected]=useState<string|null>(null),[selectedDay,setSelectedDay]=useState<string|null>(null);
  const buckets=trainingBuckets(state.activities,sport,range,anchor,now), cells=trainingAtlas(state.activities,sport,anchor,now);
  const bucket=buckets.find(b=>b.start===selected)??buckets.find(b=>b.partial)??buckets.filter(b=>Date.parse(b.start)<=now.getTime()).at(-1)??buckets[0]!;
  const max=Math.max(1,...buckets.map(b=>b.movingSec));
  const day=cells.find(d=>d.day===selectedDay)??cells.find(d=>d.day===dayKey(now))??cells.find(d=>d.inMonth&&!d.future);
  const dateLabel=range==="week"?formatWeeklyCompetitionRange(anchor):anchor.toLocaleDateString("en-US",{timeZone:APP_TIMEZONE,...(range==="year"?{year:"numeric"}:{month:"long",year:"numeric"})});
  const move=(direction:number)=>{setAnchor(range==="week"?shiftAppDay(anchor,direction*7):shiftTrainingMonth(anchor,direction*(range==="year"?12:1)));setSelected(null);setSelectedDay(null);};
  const next=range==="week"?shiftAppDay(anchor,7):shiftTrainingMonth(anchor,range==="year"?12:1);
  const nextAllowed=range==="year"?dayKey(next).slice(0,4)<=dayKey(now).slice(0,4):range==="month"?dayKey(next).slice(0,7)<=dayKey(now).slice(0,7):weeklyPeriodBounds(next).startsAt<=now;
  return <section className="focus-card training-atlas" aria-label="Training atlas">
    <div className="focus-row"><h2>Your training</h2><label className="atlas-sport"><span className="sr-only">Atlas sport</span><select value={sport} onChange={e=>{setSport(e.target.value as SportId|"all");setSelected(null);}}><option value="all">All sports</option>{SPORTS.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>
    <div className="focus-elo-track-toggle" role="group" aria-label="Training chart range">{(["week","month","year"] as const).map(r=><button key={r} type="button" aria-pressed={range===r} onClick={()=>{setRange(r);setSelected(null);}}>{r[0]!.toUpperCase()+r.slice(1)}</button>)}</div>
    <div className="atlas-heading"><button type="button" aria-label={`Previous ${range}`} onClick={()=>move(-1)}>←</button><strong>{dateLabel}</strong><button type="button" aria-label={`Next ${range}`} disabled={!nextAllowed} onClick={()=>move(1)}>→</button></div>
    <div className="club-training-total"><span className="fb-kicker">Active time</span><strong>{formatTrainingHours(buckets.reduce((sum,b)=>sum+b.movingSec,0))}<small> hr</small></strong><span className="fb-note">{buckets.reduce((sum,b)=>sum+b.sessions,0)} sessions · {sport==="all"?"All sports":sportById(sport).name}</span></div>
    <div className="atlas-chart-scroll"><div className="atlas-bars" style={{minWidth:range==="year"?528:undefined}} role="group" aria-label="Training hours">{buckets.map(b=><button key={b.start} type="button" disabled={Date.parse(b.start)>now.getTime()} aria-pressed={bucket.start===b.start} aria-label={`${b.label}: ${formatTrainingHours(b.movingSec)} hours, ${b.sessions} sessions${b.partial?", partial period":""}`} onClick={()=>setSelected(b.start)}><span className={b.partial?"is-partial":""} style={{height:b.movingSec?`${Math.max(2,b.movingSec/max*100)}%`:0}}/><small>{b.label}</small></button>)}</div></div>
    <div className="atlas-reading" aria-live="polite"><strong>{formatTrainingHours(bucket.movingSec)} <small>hr</small></strong><span>{bucket.label} · {bucket.sessions} session{bucket.sessions===1?"":"s"}{bucket.partial?" · so far":""}</span></div>
    <details className="club-calendar"><summary>Daily activity <span>＋</span></summary>
    <p className="fb-kicker">{anchor.toLocaleDateString("en-US",{month:"long",timeZone:APP_TIMEZONE})} · daily activity</p>
    <div className="atlas-chart-scroll"><div className="atlas-month"><div className="atlas-weekdays" aria-hidden="true">{["M","T","W","T","F","S","S"].map((d,i)=><span key={i}>{d}</span>)}</div><div className="atlas-grid" role="group" aria-label={`${anchor.toLocaleDateString("en-US",{month:"long",year:"numeric",timeZone:APP_TIMEZONE})} recorded activity`}>{cells.map(d=><button type="button" key={d.day} disabled={!d.inMonth||d.future} data-intensity={d.intensity} aria-label={`${d.day}: ${formatTrainingHours(d.movingSec)} hours, ${d.sessions} sessions`} aria-pressed={day?.day===d.day} onClick={()=>setSelectedDay(d.day)}>{d.inMonth?d.label:""}</button>)}</div></div></div>
    <div className="atlas-day" aria-live="polite">{day?<><p className="fb-kicker">{new Date(`${day.day}T12:00:00Z`).toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:APP_TIMEZONE})} · {formatTrainingHours(day.movingSec)} hr</p>{day.activityIds.length?day.activityIds.map(id=>{const a=state.activities.find(a=>a.id===id)!;return <details key={id}><summary>{sportById(a.sport).name}<span>{formatTrainingHours(a.movingSec)} hr</span></summary><p className="fb-note">{a.source} · {a.verified?"GPS verified":"Open"}</p></details>;}):<p className="fb-note">Nothing recorded.</p>}</>:<p className="fb-note">No recorded days in this selection.</p>}</div>
    </details>
    <p className="atlas-legend"><span>Moving time · Open activity</span><span>Less <i data-intensity="0"/><i data-intensity="1"/><i data-intensity="2"/><i data-intensity="3"/><i data-intensity="4"/> More</span></p>
  </section>;
}
