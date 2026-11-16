import { startOfZonedDay, weeklyPeriodBounds } from '../period';
import { countsForTraining, walkingStepsInPeriod } from './journal';
import { mergeActivities } from './ledger';
import { calculateLiveEffortScore, type EffortState } from './effort-score';
import type { CompeteState, SportId } from './sports';

/** Training eligibility is independent of event registration and sensor bonuses. */
export function eligibleEffortVolume(state: Pick<CompeteState,'activities'|'dailyHealth'>, sport: SportId, start: Date, end: Date, deduplicate = true): number {
  if(sport==='walking') return walkingStepsInPeriod(state.dailyHealth,start,end,end);
  return (deduplicate ? mergeActivities([],state.activities) : state.activities).reduce((sum,activity)=>{
    const at=Date.parse(activity.startedAt);
    if(activity.sport!==sport||!countsForTraining(activity)||!Number.isFinite(at)||at<start.getTime()||at>=end.getTime()) return sum;
    const volume=sport==='strength'?activity.movingSec:activity.distanceM;
    return sum+(Number.isFinite(volume)?Math.max(0,volume):0);
  },0);
}

export function liveEffortFromActivities(state: Pick<CompeteState,'activities'|'dailyHealth'>, sport: SportId, frozen: EffortState, now: Date){
  const week=weeklyPeriodBounds(now),today=startOfZonedDay(now);
  return calculateLiveEffortScore(sport,frozen,{now,
    eligibleVolumeBeforeToday:eligibleEffortVolume(state,sport,week.startsAt,today),
    eligibleVolumeToday:eligibleEffortVolume(state,sport,today,new Date(now.getTime()+1))});
}
