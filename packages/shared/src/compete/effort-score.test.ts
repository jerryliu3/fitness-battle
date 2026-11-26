import { describe, expect, it } from 'vitest';
import { createStarterEffortState, effortBoostMultiplier } from './effort-score';
import { trainingXpForVolume, calculateLiveEffortScore, createDeclaredEffortState, createEmptyEffortState, getScoreBreakdown, historicalBonusPoints, placementRewardPoints, settleEffortWeek, SPORT_CONFIG, trainingPosition, updateEffortBaseline, type EffortState } from './effort-score';
const mile = 1609.344;
const established = (miles = 35): EffortState => ({ ...createEmptyEffortState(), baselineWeeklyVolume: miles*mile, peakObservedBaselineWeeklyVolume: miles*mile, calibrationSamples: 7, cumulativeNormalizedVolume: 26, officialRankIndex: 5 });
const live = (s: EffortState, day: string, a=0, d=0) => calculateLiveEffortScore('running', s, {now:new Date(day),trainingXpBeforeToday:trainingXpForVolume('running',a*mile),trainingXpToday:trainingXpForVolume('running',d*mile)});

describe('canonical effort score',()=>{
 it('scales the boost by covered history days',()=>{
  expect(effortBoostMultiplier(0)).toBe(1);
  expect(effortBoostMultiplier(45)).toBe(2);
  expect(effortBoostMultiplier(90)).toBe(3);
 });
 it('reaches the same steady training anchor with or without a boost',()=>{
  const eligibleTrainingXp = trainingXpForVolume('running', 7 * mile);
  function train(weeks: number, boostedWeeks: number) {
   let state = createStarterEffortState();
   for (let index = 0; index < weeks; index++) {
    const date = new Date(Date.UTC(2026, 0, 5 + 7 * index));
    state = settleEffortWeek('running', state, {
     weekId: date.toISOString().slice(0, 10), eligibleTrainingXp,
     starterCredit: { ordinaryWeeks: 1, boostedWeeks: index < boostedWeeks ? 2 : 0 },
    }).state;
   }
   return getScoreBreakdown('running', state).trainingPoints;
  }
  expect(train(4, 0)).toBeCloseTo(625);
  expect(train(4, 4)).toBeCloseTo(1875);
  expect(train(16, 0)).toBeCloseTo(2500);
  expect(train(8, 4)).toBeCloseTo(2500);
 });
 it('keeps the ordinary loss when a boosted week lowers the training score',()=>{
  const state = { ...established(), calibrationSamples: 1, starterProgress: 10 };
  const week = { weekId: '2026-01-05', eligibleTrainingXp: trainingXpForVolume('running', mile) };
  const ordinary = settleEffortWeek('running', state, {
   ...week, starterCredit: { ordinaryWeeks: 1, boostedWeeks: 0 },
  });
  const boosted = settleEffortWeek('running', state, {
   ...week, starterCredit: { ordinaryWeeks: 1, boostedWeeks: 2 },
  });
  expect(boosted.state).toEqual(ordinary.state);
 });
 it('maps every native-unit anchor and extrapolates without a cap',()=>{
  for(const sport of ['running','cycling','walking','strength'] as const){
   SPORT_CONFIG[sport].anchors.forEach((volume,index)=>expect(trainingPosition(sport,volume)).toBe(index));
   expect(trainingPosition(sport,SPORT_CONFIG[sport].anchors[8]!*2)).toBeGreaterThan(8);
  }
  expect(getScoreBreakdown('running',createEmptyEffortState()).displayedScore).toBe(0);
  expect(historicalBonusPoints(52)).toBeCloseTo(221.1992,3);
  expect(historicalBonusPoints(0)).toBe(0);
 });
 it('caps declaration without granting a verified peak or lifetime volume',()=>{
  const s=createDeclaredEffortState('running',1000*mile);
  expect(s.baselineWeeklyVolume).toBe(55*mile);expect(s.officialRankIndex).toBe(6);
  expect(s.calibrationSamples).toBe(1);expect(s.peakObservedBaselineWeeklyVolume).toBe(0);expect(s.cumulativeNormalizedVolume).toBe(0);
 });
 it('uses the exact branch order for provisional, decline, recovery and new highs',()=>{
  const s=established();
  expect(updateEffortBaseline('running',s,0)).toBeCloseTo(35*mile*19/20);
  expect(updateEffortBaseline('running',s,42*mile)).toBeCloseTo(36*mile);
  expect(updateEffortBaseline('running',{...s,baselineWeeklyVolume:60*mile,peakObservedBaselineWeeklyVolume:60*mile},120*mile)).toBeCloseTo(61*mile);
  expect(updateEffortBaseline('running',{...s,baselineWeeklyVolume:20*mile},100*mile)).toBe(35*mile);
  expect(updateEffortBaseline('running',createDeclaredEffortState('running',10*mile),20*mile)).toBe(15*mile);
 });
 it('awards interpolated placements, splits occupied ties and neutralizes small/all-tie fields',()=>{
  const entries=Array.from({length:8},(_,i)=>({participantId:String(i),eligibleEventVolume:8-i}));
  expect(entries.map(p=>placementRewardPoints({yourParticipantId:p.participantId,participants:entries}))).toEqual([100,75,50,30,15,0,-15,-30]);
  entries[1]!.eligibleEventVolume=8;
  expect(placementRewardPoints({yourParticipantId:'0',participants:entries})).toBe(87.5);
  expect(placementRewardPoints({yourParticipantId:'0',participants:entries.slice(0,3)})).toBe(0);
  expect(placementRewardPoints({yourParticipantId:'0',participants:entries.map(p=>({...p,eligibleEventVolume:0}))})).toBe(0);
 });
 it('settles each Monday once, rejects gaps and protects demotion for two weeks',()=>{
  const s=established();
  const first=settleEffortWeek('running',s,{weekId:'2026-11-02',eligibleTrainingXp:trainingXpForVolume('running',0)});
  expect(first.state.officialRankIndex).toBe(5);expect(first.state.consecutiveBelowRankWeeks).toBe(1);
  expect(settleEffortWeek('running',first.state,{weekId:'2026-11-02',eligibleTrainingXp:trainingXpForVolume('running',99)}).state).toBe(first.state);
  expect(()=>settleEffortWeek('running',first.state,{weekId:'2026-11-23',eligibleTrainingXp:trainingXpForVolume('running',0)})).toThrow('non-contiguous');
  const second=settleEffortWeek('running',first.state,{weekId:'2026-11-09',eligibleTrainingXp:trainingXpForVolume('running',0)});
  expect(second.state.officialRankIndex).toBeLessThan(5);
  expect(second.state.cumulativeNormalizedVolume).toBe(s.cumulativeNormalizedVolume);
 });
});
describe('read-only daily effort projection',()=>{
 it('holds a Monday shortfall until Tuesday, and nets workouts against it',()=>{
  const s=established();const original=structuredClone(s);
  const morning=live(s,'2026-11-02T15:00:00Z');
  expect(morning.liveScore).toBe(getScoreBreakdown('running',s).displayedScore);
  expect(live(s,'2026-11-02T20:00:00Z',0,1).liveScore).toBe(morning.liveScore);
  const above=live(s,'2026-11-02T20:00:00Z',0,10);
  expect(above.liveScore).toBeGreaterThan(morning.liveScore);
  expect(above.currentDayGain).toBe(above.activityScore-morning.morningScore);
  expect(live(s,'2026-11-03T05:00:00Z').liveScore).toBeLessThan(morning.liveScore);
  expect(s).toEqual(original);
 });
 it('is monotone through multiple workouts without projecting historical credit',()=>{
  const s=established();let previous=0;
  for(const d of [0,1,5,10,20]){
   const result=live(s,'2026-11-02T22:00:00Z',0,d);
   expect(result.liveScore).toBeGreaterThanOrEqual(previous);previous=result.liveScore;
   const baseline=updateEffortBaseline('running',s,result.activityProjectedVolume);
   const expected=getScoreBreakdown('running',{...s,baselineWeeklyVolume:baseline,cumulativeNormalizedVolume:s.cumulativeNormalizedVolume+d/20});
   expect(result.activityScore).toBe(expected.displayedScore);
  }
 });
 it('Sunday candidate exactly matches weekly training/history, with explicit competition decay only at settlement',()=>{
  const s={...established(),competitionOffsetPoints:100};
  const sunday=live(s,'2026-11-09T04:59:59Z',30,5);
  expect(sunday.activityProjectedVolume).toBeCloseTo(35*mile);
  const settled=settleEffortWeek('running',s,{weekId:'2026-11-02',eligibleTrainingXp:trainingXpForVolume('running',35*mile)});
  expect(sunday.activityScore-settled.after.displayedScore).toBe(50);
 });
 it('uses Eastern calendar boundaries through spring and autumn DST changes',()=>{
  for(const at of ['2026-03-08T06:59:00Z','2026-03-08T07:01:00Z','2026-11-01T05:59:00Z','2026-11-01T06:01:00Z']){
   const result=live(established(),at);
   expect(result.activityProjectedVolume).toBe(0);
   expect(result.localDayStart).toBe(at.startsWith('2026-03')?'2026-03-08T05:00:00.000Z':'2026-11-01T04:00:00.000Z');
  }
 });
 it('previews use the same recovery, provisional and Master+ weekly branches',()=>{
  for(const s of [createDeclaredEffortState('running',0),established(60),{...established(60),baselineWeeklyVolume:20*mile}]){
   const result=live(s,'2026-11-09T04:00:00Z',80,10);
   const settled=settleEffortWeek('running',s,{weekId:'2026-11-02',eligibleTrainingXp:trainingXpForVolume('running',90*mile)});
   expect(result.activityScore).toBe(settled.after.displayedScore);
  }
 });
});

it('previews the same starter training credit as weekly settlement when all training is observed', () => {
  const state = createStarterEffortState();
  const eligibleTrainingXp = trainingXpForVolume('running', 7 * mile);
  const starterCredit = { ordinaryWeeks: 1, boostedWeeks: 2 };
  const week = settleEffortWeek('running', state, { weekId: '2026-01-05', eligibleTrainingXp, starterCredit });
  const preview = calculateLiveEffortScore('running', state, {
    now: new Date('2026-01-11T20:00:00Z'),
    trainingXpBeforeToday: 0,
    trainingXpToday: eligibleTrainingXp,
    activityCredit: starterCredit,
  });
  expect(preview.liveScore).toBe(week.after.displayedScore);
});
