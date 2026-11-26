import { expect,it } from 'vitest';
import { freshState,settleCompetition, reduceCompete } from './engine';
import { initializeEffortAccounts,settleAccountEffort,readAccountEffort,replayEffortHistory, historyEffortCredit, startAccountEffort, type HistoryEffortAward } from './effort-account';
import type { Activity } from './sports';
const activity:Activity={id:'strava-real',sport:'running',startedAt:'2026-11-16T14:00:00Z',distanceM:16093.44,movingSec:3600,avgHr:null,verified:true,source:'strava',provenance:'recorded',disposition:'counted'};
it('uses calendar volume even without an enrollment and persists an idempotent frozen baseline',()=>{
 const now=new Date('2026-11-16T12:00:00Z');let state=initializeEffortAccounts(freshState(now),now);
 state={...state,activities:[activity]};
 const live=readAccountEffort(state,'running',new Date('2026-11-16T20:00:00Z'))!;
 expect(live.liveScore).toBeGreaterThan(0);expect(state.effortAccounts!.running!.state.calibrationSamples).toBe(0);
 const settled=settleAccountEffort(state,new Date('2026-11-23T05:00:00Z'));
 expect(settled.effortAccounts!.running!.state.calibrationSamples).toBe(1);
 const paceBonus = .08 * (1 - activity.movingSec / 60 / (activity.distanceM / 1000) / 6.5);
 expect(settled.effortAccounts!.running!.state.cumulativeNormalizedVolume).toBeCloseTo(.5 * (1 + paceBonus), 10);
 expect(settleAccountEffort(settled,new Date('2026-11-23T05:00:00Z'))).toEqual(settled);
 expect(settleAccountEffort(settled,new Date('2026-12-07T05:00:00Z')).effortAccounts!.running!.state.calibrationSamples).toBe(3);
});
it('does not apply milestone awards in the new scoring model',()=>{
 const now=new Date('2026-11-16T12:00:00Z');const state=initializeEffortAccounts(freshState(now),now);
 const next=settleCompetition({...state,activities:[activity]},new Date('2026-11-16T20:00:00Z'));
 expect(next.effortMilestones??[]).toEqual([]);
 expect(next.ratings.find(r=>r.sport==='running')!.openElo).toBe(0);
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

const importAward: HistoryEffortAward = {
  primarySport: 'running',
  coveredHistoryDays: 90,
  weeklyVolumes: { running: 7 * 1609.344, cycling: 40 * 1609.344 },
  multiplier: 3,
  startsAt: '2026-11-16T12:00:00Z',
  boostEndsAt: '2026-12-16T12:00:00Z',
};

it('credits ten percent of each historical training benchmark while sharing the boost', () => {
  const now = new Date(importAward.startsAt);
  const credited = startAccountEffort(freshState(now), importAward);
  expect(historyEffortCredit(importAward)).toBe(250);
  expect(historyEffortCredit({ ...importAward, coveredHistoryDays: 45 })).toBe(125);
  expect(credited.ratings.find(r => r.sport === 'running')?.openElo).toBe(250);
  expect(credited.ratings.find(r => r.sport === 'cycling')?.openElo).toBe(250);
  expect(credited.ratings.find(r => r.sport === 'strength')?.openElo).toBe(0);
  expect(credited.effortAccounts?.strength?.starter?.multiplier).toBe(3);
  expect(readAccountEffort(credited, 'running', now)?.liveScore).toBe(250);
  expect(startAccountEffort(credited, importAward)).toBe(credited);
});

it('starts at zero without history and preserves higher earned progress during a later import', () => {
  const now = new Date('2026-11-09T12:00:00Z');
  const newAccount = reduceCompete(freshState(now), { type: 'complete-onboarding', now: now.toISOString() });
  expect(newAccount.effortAccounts?.running?.state.starterProgress).toBe(0);
  expect(newAccount.ratings.find(r => r.sport === 'running')?.openElo).toBe(0);
  const earned = settleAccountEffort({
    ...newAccount,
    activities: [{ ...activity, startedAt: '2026-11-13T14:00:00Z', distanceM: 35 * 1609.344 }],
  }, new Date(importAward.startsAt));
  expect(earned.ratings.find(r => r.sport === 'running')!.openElo).toBeGreaterThan(250);
  const imported = startAccountEffort(earned, importAward);
  expect(imported.ratings.find(r => r.sport === 'running')?.openElo)
    .toBe(earned.ratings.find(r => r.sport === 'running')?.openElo);
  expect(imported.effortAccounts?.running?.starter?.multiplier).toBe(3);
});
