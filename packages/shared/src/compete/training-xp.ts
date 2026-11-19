import { trainingXpForVolume } from './effort-score';
import { countsForTraining, maxStepsOnDay } from './journal';
import { dayKey, shiftAppDay } from '../period';
import { provenanceOf } from './activity-meta';
import { mergeActivities, sameWorkout } from './ledger';
import { SPORT_IDS, type Activity, type CompeteState, type SportId } from './sports';

/** Walking XP comes only from daily step readings, never inferred workout distance. */
export function activityBaseTrainingXp(activity: Activity): number {
  if (!countsForTraining(activity) || activity.sport === 'walking' || !Number.isFinite(Date.parse(activity.startedAt))) return 0;
  const volume = activity.sport === 'strength' ? activity.movingSec : activity.distanceM;
  return Number.isFinite(volume) ? trainingXpForVolume(activity.sport, Math.max(0, volume)) : 0;
}

// First Eastern training week using intensity. Older workouts retain base XP.
const INTENSITY_START = Date.parse('2026-11-16T05:00:00Z');
// Start a new Eastern week so results from the first version remain reproducible.
const PERSONALIZED_RUNNING_START = Date.parse('2026-11-23T05:00:00Z');
const BASELINE_LOOKBACK_MS = 60 * 86_400_000;
const MIN_BASELINE_RUNS = 5;
const clampFraction = (value: number) => Math.max(0, Math.min(1, value));

function medianBaseline(values: number[]): number | undefined {
  if (values.length < MIN_BASELINE_RUNS) return undefined;
  values.sort((a, b) => a - b);
  return (values[Math.floor((values.length - 1) / 2)] + values[Math.floor(values.length / 2)]) / 2;
}

function validHeartRate(value: number | null): value is number {
  return value != null && value >= 20 && value <= 260;
}

function runningIntensityBonus(activity: Activity, history: readonly Activity[], at: number): number {
  const { distanceM, movingSec, avgHr, elevationGainM } = activity;
  if (!Number.isFinite(distanceM) || distanceM <= 500 || !Number.isFinite(movingSec) || movingSec <= 0) return 0;
  const comparable = mergeActivities([], history.filter(run => {
    const startedAt = Date.parse(run.startedAt);
    return run.id !== activity.id && run.sport === 'running' && startedAt >= at - BASELINE_LOOKBACK_MS && startedAt < at
      && run.distanceM >= distanceM * 0.75 && run.distanceM <= distanceM * 1.25
      && run.source !== 'manual' && provenanceOf(run) === 'recorded' && countsForTraining(run) && !sameWorkout(run, activity);
  }));
  if (validHeartRate(avgHr)) {
    const baseline = medianBaseline(comparable.map(run => run.avgHr).filter(validHeartRate));
    if (baseline !== undefined) return 0.25 * clampFraction((avgHr - baseline) / 20);
  }

  if (elevationGainM == null || !Number.isFinite(elevationGainM) || elevationGainM < 0) return 0;
  const climbPerKm = elevationGainM * 1000 / distanceM;
  const baseline = medianBaseline(comparable.flatMap(run => {
    const gain = run.elevationGainM;
    return gain != null && Number.isFinite(gain) && gain >= 0 && Math.abs(gain * 1000 / run.distanceM - climbPerKm) <= 10
      && Number.isFinite(run.movingSec) && run.movingSec > 0 ? [run.movingSec / run.distanceM] : [];
  }));
  return baseline === undefined ? 0 : 0.15 * clampFraction((1 - (movingSec / distanceM) / baseline) / 0.2);
}

function trainingIntensityMultiplier(activity: Activity, history: readonly Activity[]): number {
  const at = Date.parse(activity.startedAt);
  if (at < INTENSITY_START || activity.source === 'manual' || provenanceOf(activity) !== 'recorded') return 1;
  if (activity.sport === 'running' && at >= PERSONALIZED_RUNNING_START) return 1 + runningIntensityBonus(activity, history, at);
  const { avgHr, distanceM, movingSec, sport } = activity;
  const heartRateBonus = validHeartRate(avgHr)
    ? 0.12 * clampFraction((avgHr - 110) / 70)
    : 0;
  const paceThreshold = sport === 'running' ? 6.5 : sport === 'cycling' ? 3 : 0;
  const paceBonus = paceThreshold > 0 && distanceM > 500 && Number.isFinite(movingSec) && movingSec > 0
    ? 0.08 * clampFraction(1 - movingSec / 60 / (distanceM / 1000) / paceThreshold)
    : 0;
  return 1 + Math.max(heartRateBonus, paceBonus);
}

export function activityTrainingXp(activity: Activity, history: readonly Activity[] = []): number {
  const base = activityBaseTrainingXp(activity);
  return base > 0 ? base * trainingIntensityMultiplier(activity, history) : 0;
}

/** One canonical workout; full precision through aggregation. */
export function eligibleTrainingXp(state: Pick<CompeteState, 'activities' | 'dailyHealth'>, sport: SportId, start: Date, end: Date, deduplicate = true, history: readonly Activity[] = state.activities): number {
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
  const activities = deduplicate ? mergeActivities([], state.activities) : state.activities;
  const baseline = history === state.activities ? activities : history;
  return activities.reduce((sum, activity) => {
    const at = Date.parse(activity.startedAt);
    return activity.sport === sport && Number.isFinite(at) && at >= start.getTime() && at < end.getTime()
      ? sum + activityTrainingXp(activity, baseline) : sum;
  }, 0);
}

export function formatTrainingXp(xp: number): string {
  return Number.isFinite(xp) ? xp.toLocaleString('en-US', { maximumFractionDigits: 1 }) : '—';
}

/** Calendar totals share the exact scorer eligibility and provider deduplication. */
export function trainingXpInPeriod(state: Pick<CompeteState, 'activities' | 'dailyHealth'>, start: Date, end: Date, sports: readonly SportId[] = SPORT_IDS, history: readonly Activity[] = state.activities): number {
  const canonical = {...state, activities: mergeActivities([], state.activities)};
  return sports.reduce((sum, sport) => sum + eligibleTrainingXp(canonical, sport, start, end, false, history === state.activities ? canonical.activities : history), 0);
}
