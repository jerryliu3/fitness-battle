import { trainingXpForVolume } from './effort-score';
import { countsForTraining, maxStepsOnDay } from './journal';
import { dayKey, shiftAppDay } from '../period';
import { provenanceOf } from './activity-meta';
import { mergeActivities } from './ledger';
import { SPORT_IDS, type Activity, type CompeteState, type SportId } from './sports';

/** Walking XP comes only from daily step readings, never inferred workout distance. */
export function activityBaseTrainingXp(activity: Activity): number {
  if (!countsForTraining(activity) || activity.sport === 'walking' || !Number.isFinite(Date.parse(activity.startedAt))) return 0;
  const volume = activity.sport === 'strength' ? activity.movingSec : activity.distanceM;
  return Number.isFinite(volume) ? trainingXpForVolume(activity.sport, Math.max(0, volume)) : 0;
}

// First Eastern training week using intensity. Older workouts retain base XP.
const INTENSITY_START = Date.parse('2026-11-16T05:00:00Z');
const clampFraction = (value: number) => Math.max(0, Math.min(1, value));

function trainingIntensityMultiplier(activity: Activity): number {
  if (Date.parse(activity.startedAt) < INTENSITY_START || activity.source === 'manual' || provenanceOf(activity) !== 'recorded') return 1;
  const { avgHr, distanceM, movingSec, sport } = activity;
  const heartRateBonus = avgHr != null && avgHr >= 20 && avgHr <= 260
    ? 0.12 * clampFraction((avgHr - 110) / 70)
    : 0;
  const paceThreshold = sport === 'running' ? 6.5 : sport === 'cycling' ? 3 : 0;
  const paceBonus = paceThreshold > 0 && distanceM > 500 && Number.isFinite(movingSec) && movingSec > 0
    ? 0.08 * clampFraction(1 - movingSec / 60 / (distanceM / 1000) / paceThreshold)
    : 0;
  return 1 + Math.max(heartRateBonus, paceBonus);
}

export function activityTrainingXp(activity: Activity): number {
  return activityBaseTrainingXp(activity) * trainingIntensityMultiplier(activity);
}

/** One canonical workout; full precision through aggregation. */
export function eligibleTrainingXp(state: Pick<CompeteState, 'activities' | 'dailyHealth'>, sport: SportId, start: Date, end: Date, deduplicate = true): number {
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return 0;
  if (sport === 'walking') {
    // Visit observed dates only; lifetime views must not scan empty decades.
    const firstDay = Date.parse(dayKey(start));
    let steps = 0;
    for (const day of new Set((state.dailyHealth ?? []).map(row => row.day))) {
      const offset = (Date.parse(day) - firstDay) / 86_400_000;
      if (!Number.isInteger(offset) || offset < 0 || shiftAppDay(start, offset).getTime() >= end.getTime()) continue;
      steps += maxStepsOnDay(state.dailyHealth, day);
    }
    return trainingXpForVolume(sport, steps);
  }
  return (deduplicate ? mergeActivities([], state.activities) : state.activities).reduce((sum, activity) => {
    const at = Date.parse(activity.startedAt);
    return activity.sport === sport && Number.isFinite(at) && at >= start.getTime() && at < end.getTime()
      ? sum + activityTrainingXp(activity) : sum;
  }, 0);
}

export function formatTrainingXp(xp: number): string {
  return Number.isFinite(xp) ? xp.toLocaleString('en-US', { maximumFractionDigits: 1 }) : '—';
}

/** Calendar totals share the exact scorer eligibility and provider deduplication. */
export function trainingXpInPeriod(state: Pick<CompeteState, 'activities' | 'dailyHealth'>, start: Date, end: Date, sports: readonly SportId[] = SPORT_IDS): number {
  const canonical = {...state, activities: mergeActivities([], state.activities)};
  return sports.reduce((sum, sport) => sum + eligibleTrainingXp(canonical, sport, start, end, false), 0);
}
