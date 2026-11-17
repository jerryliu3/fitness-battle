import { describe, expect, it } from 'vitest';
import { activityBaseTrainingXp, activityTrainingXp, eligibleTrainingXp, formatTrainingXp, trainingXpInPeriod } from './training-xp';
import { walkingStepsInPeriod } from './journal';
import { activityCompetitionVolume, workoutSizeSummary } from './effort';
import { calculateLiveEffortScore, createDeclaredEffortState, getScoreBreakdown, historicalBonusPoints, settleEffortWeek, SPORT_CONFIG, trainingXpForVolume, updateEffortBaseline } from './effort-score';
import { type Activity, SPORT_IDS } from './sports';
const start = new Date('2026-11-16T05:00:00Z'), end = new Date('2026-11-23T05:00:00Z');
const run: Activity = { id:'run', sport:'running', startedAt:'2026-11-17T12:00:00Z', distanceM:1609.344, movingSec:600, avgHr:140, source:'strava', verified:true, provenance:'recorded', disposition:'counted' };
describe('Training XP', () => {
 it('normalizes a reference week to 1000 XP in each sport without HR or pace bonuses', () => {
  for (const sport of SPORT_IDS) expect(trainingXpForVolume(sport, SPORT_CONFIG[sport].referenceVolume)).toBe(1000);
  expect(activityTrainingXp(run)).toBe(50);
  expect(activityTrainingXp({...run, avgHr:190, movingSec:300})).toBe(50);
  expect(activityTrainingXp({...run, sport:'strength', movingSec:60})).toBeCloseTo(1000/180);
  expect(activityTrainingXp({...run, sport:'cycling', distanceM:1609.344})).toBe(10);
  expect(activityTrainingXp({...run, sport:'walking'})).toBe(0);
 });
 it('launches with neutral intensity for recorded HR, missing HR and manual workouts', () => {
  for(const activity of [run,{...run,avgHr:null},{...run,avgHr:190,movingSec:300},{...run,source:'manual' as const,provenance:'manual' as const,verified:false}]) {
   expect(activityBaseTrainingXp(activity)).toBe(50);
   expect(activityTrainingXp(activity)).toBe(activityBaseTrainingXp(activity));
   expect(eligibleTrainingXp({activities:[activity]},'running',start,end)).toBe(50);
  }
 });
 it('preserves full precision and rounds only presentation', () => {
  const xp=activityTrainingXp({...run, distanceM:1});
  expect(xp).toBeCloseTo(1000/SPORT_CONFIG.running.referenceVolume,15);
  const activities=Array.from({length:10},(_,i)=>({...run,id:`run-${i}`,startedAt:new Date(start.getTime()+i*3600000).toISOString(),distanceM:1}));
  expect(eligibleTrainingXp({activities},'running',start,end)).toBeCloseTo(xp*10,14);
  expect(formatTrainingXp(1234.56789)).toBe('1,234.6');
 });
 it('deduplicates providers before aggregating and enforces training eligibility and half-open bounds', () => {
  const activities: Activity[]=[run,{...run,id:'garmin-copy',source:'garmin'},
   {...run,id:'excluded',startedAt:'2026-11-18T12:00:00Z',disposition:'excluded'},
   {...run,id:'pending',startedAt:'2026-11-18T13:00:00Z',disposition:'pending'},
   {...run,id:'demo',startedAt:'2026-11-18T14:00:00Z',provenance:'demo'},
   {...run,id:'invalid',startedAt:'invalid'},
   {...run,id:'boundary',startedAt:end.toISOString()},
   {...run,id:'manual',startedAt:'2026-11-19T12:00:00Z',source:'manual',provenance:'manual',journalOnly:true}];
  expect(eligibleTrainingXp({activities},'running',start,end)).toBe(100);
  expect(activityTrainingXp({...run,distanceM:NaN})).toBe(0);
  expect(activityTrainingXp({...run,distanceM:-1})).toBe(0);
 });
 it('credits daily steps once across providers and never also credits a walking workout', () => {
  const state={activities:[{...run,sport:'walking' as const}],dailyHealth:[
   {provider:'garmin' as const,day:'2026-11-17',steps:5600},
   {provider:'apple_health' as const,day:'2026-11-17',steps:7000},
   {provider:'garmin' as const,day:'2026-11-18',steps:5600}]};
  expect(eligibleTrainingXp(state,'walking',start,end)).toBe(225);
  expect(trainingXpInPeriod(state,start,end)).toBe(225);
 });
 it('matches existing walking calendar semantics through DST and wide history windows', () => {
  const dailyHealth=[{provider:'garmin' as const, day:'2026-11-01', steps:10000}, {provider:'apple_health' as const,day:'2026-11-01',steps:12000}, {provider:'garmin' as const,day:'2026-11-02',steps:5000}];
  for(const [from,to] of [['2026-10-26T04:00:00Z','2026-11-02T05:00:00Z'],['2026-11-01T04:00:00Z','2026-11-03T05:00:00Z'],['2026-11-02T05:00:00Z','2026-11-03T05:00:00Z']]) {
   const start=new Date(from), end=new Date(to);
   expect(eligibleTrainingXp({activities:[],dailyHealth},'walking',start,end)).toBe(trainingXpForVolume('walking',walkingStepsInPeriod(dailyHealth,start,end,end)));
  }
  expect(trainingXpInPeriod({activities:[],dailyHealth},new Date(0),new Date('2026-11-03T05:00:00Z'))).toBeCloseTo(17000/56000*1000);
 });
 it('leaves weekly baseline, lifetime credit, rank, recovery and competition math unchanged', () => {
  for(const sport of SPORT_IDS){
   let state=createDeclaredEffortState(sport,SPORT_CONFIG[sport].anchors[5]!);
   for(let week=0;week<30;week++){
    const volume=SPORT_CONFIG[sport].referenceVolume*[0,0.1,1,3,5,0.3][week%6]!;
    const baseline=updateEffortBaseline(sport,state,volume);
    const q=state.cumulativeNormalizedVolume+volume/SPORT_CONFIG[sport].referenceVolume;
    const expected=getScoreBreakdown(sport,{...state,baselineWeeklyVolume:baseline,cumulativeNormalizedVolume:q,competitionOffsetPoints:state.competitionOffsetPoints*.5+15});
    const result=settleEffortWeek(sport,state,{weekId:new Date(Date.UTC(2026,10,16+week*7)).toISOString().slice(0,10),eligibleTrainingXp:trainingXpForVolume(sport,volume),placementReward:15});
    expect(result.state.baselineWeeklyVolume).toBeCloseTo(baseline,8);
    expect(result.after.historyPoints).toBeCloseTo(historicalBonusPoints(q),10);
    expect(result.after.displayedScore).toBe(expected.displayedScore);
    expect(result.after.scoreBasedRankIndex).toBe(expected.scoreBasedRankIndex);
    state=result.state;
   }
  }
 });
 it('keeps live projections on the original volume curve and competition on native units', () => {
  const state=createDeclaredEffortState('running',SPORT_CONFIG.running.referenceVolume);
  const now=new Date('2026-11-17T12:00:00Z');
  const result=calculateLiveEffortScore('running',state,{now,trainingXpBeforeToday:100,trainingXpToday:50});
  expect(result.activityProjectedVolume).toBeCloseTo(SPORT_CONFIG.running.referenceVolume*(.15+5/7));
  expect(state.cumulativeNormalizedVolume).toBe(0);
  expect(activityCompetitionVolume(run)).toBe(1609.344);
  expect(activityCompetitionVolume({...run,movingSec:300})).toBe(1609.344);
  expect(activityCompetitionVolume({...run,sport:'strength',movingSec:600})).toBe(600);
 });
 it('describes workout size rather than intensity',()=>{
  const history=[1,2].map(i=>({...run,id:`past-${i}`,startedAt:`2026-11-${14+i}T12:00:00Z`}));
  expect(workoutSizeSummary({...run,distanceM:run.distanceM*2,avgHr:100},history).tier).toBe('very-large');
 });
});
