import { startOfZonedDay, weeklyPeriodBounds } from '../period';
import { eligibleTrainingXp } from './training-xp';
import { calculateLiveEffortScore, type EffortState } from './effort-score';
import type { TimedMultiplier } from '../multiplier';
import type { CompeteState, SportId } from './sports';

type TrainingFacts = Pick<CompeteState, 'activities' | 'dailyHealth'>;

export function effortStarterWeek(week: { startsAt: Date; endsAt: Date }, starter?: TimedMultiplier) {
  const trainingStart = starter ? new Date(Math.max(+week.startsAt, Date.parse(starter.startsAt))) : week.startsAt;
  const boostEnd = starter ? new Date(Math.min(+week.endsAt, Date.parse(starter.boostEndsAt))) : trainingStart;
  const weekLength = +week.endsAt - +week.startsAt;
  return {
    trainingStart,
    boostEnd,
    credit: (xp: number, boostedXp: number) => starter && ({
      ordinaryWeeks: (+week.endsAt - +trainingStart) / weekLength,
      boostedWeeks: xp > 0 ? boostedXp / xp * (starter.multiplier - 1) *
        Math.max(0, +boostEnd - +trainingStart) / weekLength : 0,
    }),
  };
}

export function liveEffortFromActivities(state: TrainingFacts, sport: SportId, frozen: EffortState, now: Date, starter?: TimedMultiplier) {
  const week = weeklyPeriodBounds(now);
  const today = startOfZonedDay(now);
  const { trainingStart, boostEnd, credit } = effortStarterWeek(week, starter);
  const observedEnd = new Date(now.getTime() + 1);
  const before = eligibleTrainingXp(state, sport, trainingStart, today);
  const during = eligibleTrainingXp(state, sport, new Date(Math.max(+trainingStart, +today)), observedEnd);
  const boostedUntil = (end: Date) => starter && starter.multiplier > 1
    ? eligibleTrainingXp(state, sport, trainingStart, new Date(Math.min(+end, +boostEnd))) : 0;
  return calculateLiveEffortScore(sport, frozen, {
    now, trainingXpBeforeToday: before, trainingXpToday: during,
    morningCredit: credit(before, boostedUntil(today)),
    activityCredit: credit(before + during, boostedUntil(observedEnd)),
  });
}
