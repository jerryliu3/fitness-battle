import { expect,it } from 'vitest';
import { freshState,settleCompetition,reduceCompete } from './engine';
import { initializeEffortAccounts,settleAccountEffort,readAccountEffort,replayEffortHistory } from './effort-account';
import type { Activity } from './sports';
const activity:Activity={id:'strava-real',sport:'running',startedAt:'2026-11-16T14:00:00Z',distanceM:16093.44,movingSec:3600,avgHr:null,verified:true,source:'strava',provenance:'recorded',disposition:'counted'};
it('uses calendar volume even without an enrollment and persists an idempotent frozen baseline',()=>{
 const now=new Date('2026-11-16T12:00:00Z');let state=initializeEffortAccounts(freshState(now),now);
 state={...state,activities:[activity]};
 const live=readAccountEffort(state,'running',new Date('2026-11-16T20:00:00Z'))!;
 expect(live.liveScore).toBeGreaterThan(0);expect(state.effortAccounts!.running!.state.calibrationSamples).toBe(0);
 const settled=settleAccountEffort(state,new Date('2026-11-23T05:00:00Z'));
 expect(settled.effortAccounts!.running!.state.calibrationSamples).toBe(1);
 expect(settled.effortAccounts!.running!.state.cumulativeNormalizedVolume).toBeCloseTo(.5);
 expect(settleAccountEffort(settled,new Date('2026-11-23T05:00:00Z'))).toEqual(settled);
 expect(settleAccountEffort(settled,new Date('2026-12-07T05:00:00Z')).effortAccounts!.running!.state.calibrationSamples).toBe(3);
});
it('does not apply milestone awards in the new scoring model',()=>{
 const now=new Date('2026-11-16T12:00:00Z');const state=initializeEffortAccounts(freshState(now),now);
 const next=settleCompetition({...state,activities:[activity]},new Date('2026-11-16T20:00:00Z'));
 expect(next.effortMilestones??[]).toEqual([]);
 expect(next.ratings.find(r=>r.sport==='running')!.openElo).toBe(0);
});
it('declaration is capped once and cannot overwrite recorded history or an onboarded account',()=>{
 const now=new Date('2026-11-16T12:00:00Z');const state=initializeEffortAccounts(freshState(now),now);
 const declared=reduceCompete(state,{type:'declare-effort',sport:'running',declaredWeeklyVolume:999999,now:now.toISOString()});
 expect(declared.effortAccounts!.running!.state.officialRankIndex).toBe(6);
 expect(declared.effortAccounts!.running!.state.peakObservedBaselineWeeklyVolume).toBe(0);
 const complete=reduceCompete(declared,{type:'complete-onboarding',now:now.toISOString()});
 expect(reduceCompete(complete,{type:'declare-effort',sport:'running',declaredWeeklyVolume:0,now:now.toISOString()}).effortAccounts).toEqual(complete.effortAccounts);
});
it('6 and 12 month histories recover through the verified peak, rather than Master+ new-high smoothing',()=>{
 for(const months of [6,12]){
  let state=initializeEffortAccounts(freshState(new Date('2025-01-06T12:00:00Z')),new Date('2025-01-06T12:00:00Z'));
  const start=new Date('2025-01-06T14:00:00Z');
  state.activities=Array.from({length:months*4},(_,i)=>({...activity,id:`history-${i}`,startedAt:new Date(start.getTime()+i*7*86400000).toISOString(),distanceM:80*1609.344}));
  const cutoff=new Date(start.getTime()+months*4*7*86400000);
  state=settleAccountEffort(state,cutoff);
  const peak=state.effortAccounts!.running!.state.peakObservedBaselineWeeklyVolume;
  const breakEnd=new Date(cutoff.getTime()+13*7*86400000);
  state=settleAccountEffort(state,breakEnd);
  const before=state.effortAccounts!.running!.state.baselineWeeklyVolume!;
  state.activities.push({...activity,id:'return',startedAt:breakEnd.toISOString(),distanceM:80*1609.344});
  state=settleAccountEffort(state,new Date(breakEnd.getTime()+7*86400000));
  expect(state.effortAccounts!.running!.state.baselineWeeklyVolume).toBeCloseTo(Math.min(peak,before+(80*1609.344-before)/3));
 }
});
it('leaves settled credit unchanged on ordinary reads after an old activity correction',()=>{
 const monday=new Date('2026-11-16T12:00:00Z');
 const initial=initializeEffortAccounts(freshState(monday),monday);
 const closed=settleAccountEffort({...initial,activities:[activity]},new Date('2026-11-23T12:00:00Z'));
 const corrected={...closed,activities:[{...activity,disposition:'excluded' as const}]};
 expect(settleAccountEffort(corrected,new Date('2026-11-23T12:00:00Z')).effortAccounts).toEqual(closed.effortAccounts);
 expect(replayEffortHistory(corrected,new Date('2026-11-23T12:00:00Z')).effortAccounts!.running!.state.cumulativeNormalizedVolume).toBe(0);
});
