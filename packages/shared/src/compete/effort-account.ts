import { eligibleTrainingXp } from './training-xp';
import { mergeActivities } from './ledger';
import { dayKey, shiftAppDay, weeklyPeriodBounds } from '../period';
import { createEmptyEffortState, createStarterEffortState, effortBoostMultiplier, EFFORT_BOOST_DAYS, EFFORT_STARTER_WEEKS, getScoreBreakdown, settleEffortWeek, type EffortState } from './effort-score';
import { effortStarterWeek, liveEffortFromActivities } from './effort-volume';
import { countsForTraining } from './journal';
import type { TimedMultiplier } from '../multiplier';
import { SPORT_IDS, type CompeteState, type SportId } from './sports';

export interface HistoryEffortAward extends TimedMultiplier {
  coveredHistoryDays?: number;
  primarySport?: SportId;
  weeklyVolumes?: Partial<Record<SportId, number>>;
}

function historyStarterState(award: HistoryEffortAward, sport: SportId): EffortState {
  const baseline = award.weeklyVolumes?.[sport];
  const coveredDays = award.coveredHistoryDays ?? 0;
  const starter = createStarterEffortState();
  if (!baseline || coveredDays <= 0) return starter;
  const seeded = {
    ...starter,
    baselineWeeklyVolume: baseline,
    calibrationSamples: 1,
    starterProgress: EFFORT_STARTER_WEEKS * 0.1 * coveredDays / 90,
  };
  return { ...seeded, officialRankIndex: getScoreBreakdown(sport, seeded).scoreBasedRankIndex };
}

export function historyEffortCredit(award: HistoryEffortAward): number {
  const sport = award.primarySport;
  return sport && SPORT_IDS.includes(sport) ? getScoreBreakdown(sport, historyStarterState(award, sport)).displayedScore : 0;
}

export interface SportEffortAccount {
  state: EffortState;
  nextWeek: string;
  starter?: TimedMultiplier;
  trainingStartsAt?: string;
  historyAnchor?: {
    occurredAt: string;
    displayAt?: string;
    score: number;
    replay?: { state: EffortState; starter: TimedMultiplier };
  };
}
export type EffortAccounts = Partial<Record<SportId, SportEffortAccount>>;
const dateFor = (day:string)=>new Date(`${day}T12:00:00Z`);

/** Canonical reset transform. Call with an Eastern Monday boundary and verified coverage. */
export function resetAccountEffort(state: CompeteState, startsAt: Date, coveredHistoryDays: number, weeklyVolumes?: HistoryEffortAward["weeklyVolumes"]): CompeteState {
  if (weeklyPeriodBounds(startsAt).startsAt.getTime() !== startsAt.getTime()) throw new Error('effort_reset_requires_week_boundary');
  if (state.effortAccounts?.[state.primary]?.starter?.startsAt === startsAt.toISOString()) return state;
  return startAccountEffort({ ...state, effortAccounts: undefined }, {
    startsAt: startsAt.toISOString(),
    boostEndsAt: shiftAppDay(startsAt, EFFORT_BOOST_DAYS).toISOString(),
    multiplier: effortBoostMultiplier(coveredHistoryDays),
    primarySport: state.primary, coveredHistoryDays, weeklyVolumes,
  });
}

export function startAccountEffort(state: CompeteState, award: HistoryEffortAward): CompeteState {
  const existingAward = state.effortAccounts?.[state.primary]?.starter;
  if (existingAward && (Date.parse(existingAward.startsAt) > Date.parse(award.startsAt) ||
    (existingAward.startsAt === award.startsAt && existingAward.multiplier === award.multiplier))) return state;
  const week = weeklyPeriodBounds(new Date(award.startsAt)).startsAt;
  const starter = { startsAt: award.startsAt, boostEndsAt: award.boostEndsAt, multiplier: award.multiplier };
  const effortAccounts: EffortAccounts = {};
  for (const sport of SPORT_IDS) {
    const seeded = historyStarterState(award, sport);
    const existing = state.effortAccounts?.[sport];
    const keep = existing && (existing.state.calibrationSamples > 0 || existing.state.lastSettledWeekId !== null) &&
      getScoreBreakdown(sport, existing.state).displayedScore >= getScoreBreakdown(sport, seeded).displayedScore;
    effortAccounts[sport] = keep
      ? { ...existing, starter }
      : {
        state: seeded, nextWeek: dayKey(week), starter, trainingStartsAt: award.startsAt,
        historyAnchor: { occurredAt: award.startsAt, score: getScoreBreakdown(sport, seeded).displayedScore },
      };
  }
  return {
    ...state,
    effortAccounts,
    ratings: state.ratings.map(r => {
      const score = getScoreBreakdown(r.sport, effortAccounts[r.sport]!.state).displayedScore;
      return { ...r, openElo: score, verifiedElo: score };
    }),
  };
}

/** Initializes from actual covered history; never translates legacy Elo into volume. */
export function initializeEffortAccounts(state:CompeteState, now:Date):CompeteState {
  if(state.effortAccounts && SPORT_IDS.every(sport=>Boolean(state.effortAccounts?.[sport]?.state)))return state;
  const current=weeklyPeriodBounds(now).startsAt;
  const effortAccounts:EffortAccounts={...state.effortAccounts};
  for(const sport of SPORT_IDS){
    if(effortAccounts[sport]?.state)continue;
    const dates=state.activities.filter(a=>a.sport===sport&&countsForTraining(a)).map(a=>Date.parse(a.startedAt)).filter(t=>Number.isFinite(t)&&t<now.getTime());
    if(sport==='walking') dates.push(...(state.dailyHealth??[]).filter(d=>d.steps!=null).map(d=>Date.parse(`${d.day}T12:00:00Z`)).filter(t=>Number.isFinite(t)&&t<now.getTime()));
    const start=dates.length?weeklyPeriodBounds(new Date(Math.min(...dates))).startsAt:current;
    effortAccounts[sport]={state:createEmptyEffortState(),nextWeek:dayKey(start)};
  }
  return {
    ...state,
    effortAccounts,
    ratings:state.ratings.map(r=>state.effortAccounts?.[r.sport]?.state?r:({...r,openElo:0,verifiedElo:0})),
  };
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
      const { trainingStart, boostStart, boostEnd, credit } = effortStarterWeek({ startsAt: start, endsAt: end }, account.starter, account.trainingStartsAt);
      const xp = eligibleTrainingXp(canonical, sport, trainingStart, end, false);
      const boostedXp = account.starter && account.starter.multiplier > 1 && xp > 0
        ? eligibleTrainingXp(canonical, sport, boostStart, boostEnd, false) : 0;
      const starterCredit = credit(xp, boostedXp);
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
  return liveEffortFromActivities(state,sport,account.state,now,account.starter,account.trainingStartsAt);
}

/** Explicit correction operation. Call only with canonical facts and persist via
 * the existing audited admin commit, never a normal sync or client intent.
 * Competition places remain immutable; stored reward receipts are replayed. */
export function replayEffortHistory(state:CompeteState,now:Date):CompeteState {
  return settleAccountEffort({...state,effortAccounts:undefined},now);
}
