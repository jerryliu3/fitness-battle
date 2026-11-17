import { startOfZonedDay, weeklyPeriodBounds } from '../period';
import { eligibleTrainingXp } from './training-xp';
import { calculateLiveEffortScore, type EffortState } from './effort-score';
import type { CompeteState, SportId } from './sports';

export function liveEffortFromActivities(state: Pick<CompeteState,'activities'|'dailyHealth'>, sport: SportId, frozen: EffortState, now: Date){
  const week=weeklyPeriodBounds(now),today=startOfZonedDay(now);
  return calculateLiveEffortScore(sport,frozen,{now,
    trainingXpBeforeToday:eligibleTrainingXp(state,sport,week.startsAt,today),
    trainingXpToday:eligibleTrainingXp(state,sport,today,new Date(now.getTime()+1))});
}
