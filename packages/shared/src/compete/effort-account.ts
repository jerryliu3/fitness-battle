import { eligibleTrainingXp } from './training-xp';
import { mergeActivities } from './ledger';
import { dayKey, shiftAppDay, weeklyPeriodBounds } from '../period';
import { createEmptyEffortState, createStarterEffortState, effortBoostMultiplier, EFFORT_BOOST_DAYS, getScoreBreakdown, settleEffortWeek, type EffortState } from './effort-score';
import { liveEffortFromActivities } from './effort-volume';
import { countsForTraining } from './journal';
import type { TimedMultiplier } from '../multiplier';
import { SPORT_IDS, type CompeteState, type SportId } from './sports';

export interface SportEffortAccount {
  state: EffortState;
  nextWeek: string;
  starter?: TimedMultiplier;
}
export type EffortAccounts = Partial<Record<SportId, SportEffortAccount>>;
const dateFor = (day:string)=>new Date(`${day}T12:00:00Z`);

/** Canonical reset transform. Call with an Eastern Monday boundary and verified coverage. */
export function resetAccountEffort(state: CompeteState, startsAt: Date, coveredHistoryDays: number): CompeteState {
  if (state.effortAccounts?.[state.primary]?.starter) return state;
  const week = weeklyPeriodBounds(startsAt).startsAt;
  if (week.getTime() !== startsAt.getTime()) throw new Error('effort_reset_requires_week_boundary');
  const starter = {
    startsAt: startsAt.toISOString(),
    boostEndsAt: shiftAppDay(startsAt, EFFORT_BOOST_DAYS).toISOString(),
    multiplier: effortBoostMultiplier(coveredHistoryDays),
  };
  const effortAccounts: EffortAccounts = {};
  for (const sport of SPORT_IDS) {
    effortAccounts[sport] = { state: createStarterEffortState(), nextWeek: dayKey(week), starter };
  }
  return {
    ...state,
    effortAccounts,
    ratings: state.ratings.map(r => ({ ...r, openElo: 0, verifiedElo: 0 })),
  };
}

/** Initializes from actual covered history; never translates legacy Elo into volume. */
export function initializeEffortAccounts(state:CompeteState, now:Date):CompeteState {
  if(state.effortAccounts)return state;
  const current=weeklyPeriodBounds(now).startsAt;
  const effortAccounts:EffortAccounts={};
  for(const sport of SPORT_IDS){
    const dates=state.activities.filter(a=>a.sport===sport&&countsForTraining(a)).map(a=>Date.parse(a.startedAt)).filter(t=>Number.isFinite(t)&&t<now.getTime());
    if(sport==='walking') dates.push(...(state.dailyHealth??[]).filter(d=>d.steps!=null).map(d=>Date.parse(`${d.day}T12:00:00Z`)).filter(t=>Number.isFinite(t)&&t<now.getTime()));
    const start=dates.length?weeklyPeriodBounds(new Date(Math.min(...dates))).startsAt:current;
    effortAccounts[sport]={state:createEmptyEffortState(),nextWeek:dayKey(start)};
  }
  return {...state,effortAccounts,ratings:state.ratings.map(r=>({...r,openElo:0,verifiedElo:0}))};
}

/** Called after due canonical fields are resolved, before the atomic account save. */
export function settleAccountEffort(input:CompeteState,now:Date):CompeteState {
  const initialized=initializeEffortAccounts(input,now);
  const effortAccounts={...initialized.effortAccounts};
  let periodResults=[...initialized.periodResults];
  const current=dayKey(weeklyPeriodBounds(now).startsAt);
  const canonical={...initialized,activities:mergeActivities([],initialized.activities)};
  for(const sport of SPORT_IDS){
    let account=effortAccounts[sport]!;
    // A first real backfill may arrive after the empty account was created.
    if(!account.starter && account.state.baselineWeeklyVolume===null && account.state.calibrationSamples===0){
      const imported=initializeEffortAccounts({...initialized,effortAccounts:undefined},now).effortAccounts![sport]!;
      if(imported.nextWeek<account.nextWeek)account={...account,nextWeek:imported.nextWeek};
    }
    while(account.nextWeek<current){
      const start=weeklyPeriodBounds(dateFor(account.nextWeek)).startsAt,end=shiftAppDay(start,7);
      // Don't finalize a calendar observation before its canonical event evidence.
      if(initialized.enrollments.some(e=>e.sport===sport&&Date.parse(e.weekEnd)<=end.getTime()&&Date.parse(e.weekEnd)>start.getTime()))break;
      const result=periodResults.find(r=>r.sport===sport&&r.track==='open'&&r.effortReward!==undefined&&r.periodEnd===end.toISOString());
      const xp = eligibleTrainingXp(canonical, sport, start, end, false);
      const boostEnd = account.starter && new Date(Math.min(end.getTime(), Date.parse(account.starter.boostEndsAt)));
      const boostedXp = boostEnd && xp > 0 ? eligibleTrainingXp(canonical, sport, start, boostEnd, false) : 0;
      const starterCredit = account.starter && {
        ordinaryWeeks: 1,
        boostedWeeks: xp > 0 ? boostedXp / xp * (account.starter.multiplier - 1) : 0,
      };
      const settled=settleEffortWeek(sport,account.state,{weekId:account.nextWeek,
        eligibleTrainingXp:xp,placementReward:result?.effortReward??0,starterCredit});
      const training=Math.round(settled.after.trainingPoints-settled.before.trainingPoints),history=Math.round(settled.after.historyPoints-settled.before.historyPoints);
      periodResults=periodResults.map(r=>r.sport===sport&&r.periodEnd===end.toISOString()&&r.effortReward!==undefined?{...r,eloBefore:settled.before.displayedScore,eloAfter:settled.after.displayedScore,effortChange:{training,history,competition:settled.scoreDelta-training-history}}:r);
      account={...account,state:settled.state,nextWeek:dayKey(end)};
    }
    effortAccounts[sport]=account;
  }
  return {...initialized,effortAccounts,periodResults,ratings:initialized.ratings.map(r=>{
    const score=getScoreBreakdown(r.sport,effortAccounts[r.sport]!.state).displayedScore;
    return {...r,openElo:score,verifiedElo:score};
  })};
}

export function readAccountEffort(state:CompeteState,sport:SportId,now:Date){
  const account=state.effortAccounts?.[sport];
  if(!account||account.nextWeek!==dayKey(weeklyPeriodBounds(now).startsAt))return null;
  return liveEffortFromActivities(state,sport,account.state,now);
}

/** Explicit correction operation. Call only with canonical facts and persist via
 * the existing audited admin commit, never a normal sync or client intent.
 * Competition places remain immutable; stored reward receipts are replayed. */
export function replayEffortHistory(state:CompeteState,now:Date):CompeteState {
  return settleAccountEffort({...state,effortAccounts:undefined},now);
}
