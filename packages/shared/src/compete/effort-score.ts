/**
 * Fitness Battle - Effort Score implementation contract (2026-11-16)
 * Pure TypeScript: platform-independent; no external packages.
 * One visible number, three hidden accounting components.
 * All sport volumes use metres (running/cycling), steps (walking), or seconds (strength).
 *
 * Product choices: optimistic placement rewards, bounded lifetime history,
 * quick initial calibration, fast previously-established-level recovery, slow new elite bests.
 */
import type { SportId as Sport } from './sports';
import { dayKey, getZonedWeekday, startOfZonedDay, weeklyPeriodBounds } from '../period';
export type RankName = 'Beginner' | 'Rookie' | 'Active' | 'Challenger' | 'Athlete' | 'Elite' | 'Master' | 'Olympian' | 'Champion';

export const RANK_NAMES: readonly RankName[] = [
  'Beginner', 'Rookie', 'Active', 'Challenger', 'Athlete',
  'Elite', 'Master', 'Olympian', 'Champion',
];
export const POINTS_PER_RANK = 1250;
export const LIFETIME_CAP_POINTS = 1000;
export const LIFETIME_TAU_REFERENCE_WEEKS = 208;
export const UPWARD_EWMA_DENOMINATOR = 7;
export const NEW_ELITE_BEST_EWMA_DENOMINATOR = 60;
export const RECOVERY_EWMA_DENOMINATOR = 3;
export const DOWNWARD_EWMA_DENOMINATOR = 20;
export const COMPETITION_RETENTION = 0.5;
export const EIGHT_PLAYER_REWARDS = [100, 75, 50, 30, 15, 0, -15, -30] as const;
export const MIN_RATED_FIELD = 4;
export const DEMOTION_CONFIRMATION_WEEKS = 2;
export const SCORING_VERSION = 'effort-v2.3-live-down20-2026-11-16';
export const METRES_PER_MILE = 1609.344;
const miles = (v: number) => v * METRES_PER_MILE;
const minutes = (v: number) => v * 60;

/** Proposed (NOT population-percentile-validated) weekly entry-volume anchors. */
export const SPORT_CONFIG: Record<Sport, { readonly anchors: readonly number[]; readonly referenceVolume: number }> = {
  running:  { anchors: [0, 3, 7, 12, 19, 35, 55, 80, 110].map(miles), referenceVolume: miles(20) },
  cycling:  { anchors: [0, 15, 40, 75, 125, 175, 250, 325, 400].map(miles), referenceVolume: miles(100) },
  walking:  { anchors: [0, 14000, 28000, 42000, 56000, 70000, 84000, 98000, 112000], referenceVolume: 56000 },
  strength: { anchors: [0, 60, 120, 180, 240, 360, 480, 600, 780].map(minutes), referenceVolume: minutes(180) },
};

/** Display unit only; reference-week normalization and scoring remain unchanged. */
export const TRAINING_XP_PER_REFERENCE_WEEK = 1000;
export function trainingXpForVolume(sport: Sport, volume: number): number {
  nonnegative(volume, 'training volume');
  return volume / SPORT_CONFIG[sport].referenceVolume * TRAINING_XP_PER_REFERENCE_WEEK;
}
export function trainingVolumeForXp(sport: Sport, xp: number): number {
  nonnegative(xp, 'Training XP');
  return xp / TRAINING_XP_PER_REFERENCE_WEEK * SPORT_CONFIG[sport].referenceVolume;
}

/** Persistence is per user + sport. State is not a second user-facing score. */
export interface EffortState {
  scoringVersion: string;
  baselineWeeklyVolume: number | null;
  /** Highest actual settled EWMA baseline (NOT self-reported declaration). */
  peakObservedBaselineWeeklyVolume: number;
  /** 0-7; declaration seeds one sample. */
  calibrationSamples: number;
  /** Accumulated accepted training / reference weekly volume. */
  cumulativeNormalizedVolume: number;
  competitionOffsetPoints: number;
  officialRankIndex: number;
  consecutiveBelowRankWeeks: number;
  lastSettledWeekId: string | null;
}

export interface CompetitionEntry {
  participantId: string;
  eligibleEventVolume: number;
}
export interface CompetitionInput {
  /** Includes yourself. Exactly one designated rating-bearing battle per sport/week. */
  yourParticipantId: string;
  participants: readonly CompetitionEntry[];
}
export interface WeeklyInput {
  /** Actual Monday start in America/New_York, ISO date. No skipped weeks. */
  weekId: string;
  eligibleTrainingXp: number;
  competition?: CompetitionInput | null;
  placementReward?: number;
}
export interface ScoreBreakdown {
  trainingPosition: number;
  historyPoints: number;
  competitionPoints: number;
  trainingPoints: number;
  displayedScore: number;
  scoreBasedRank: RankName;
  scoreBasedRankIndex: number;
  officialRank: RankName;
}
export interface WeeklyResult {
  state: EffortState;
  before: ScoreBreakdown;
  after: ScoreBreakdown;
  scoreDelta: number;
  placementRewardPoints: number;
  rankChange: 'promoted' | 'demoted' | 'unchanged';
  idempotentReplay: boolean;
}

function nonnegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a nonnegative finite number`);
}

/** Piecewise-linear benchmark conversion, including extrapolation above Champion. */
export function trainingPosition(sport: Sport, weeklyVolume: number): number {
  nonnegative(weeklyVolume, 'weeklyVolume');
  const a = SPORT_CONFIG[sport].anchors;
  for (let i = 0; i < a.length - 1; i++) {
    if (weeklyVolume < a[i + 1]) return i + (weeklyVolume - a[i]) / (a[i + 1] - a[i]);
  }
  const last = a.length - 1;
  return last + (weeklyVolume - a[last]) / (a[last] - a[last - 1]);
}

/** Bounded lifetime component; asymptotically below 1000, but may round to 1000 at extreme Q in floating-point. */
export function historicalBonusPoints(q: number): number {
  nonnegative(q, 'normalized cumulative volume');
  return LIFETIME_CAP_POINTS * -Math.expm1(-q / LIFETIME_TAU_REFERENCE_WEEKS);
}

export function createEmptyEffortState(): EffortState {
  return {
    scoringVersion: SCORING_VERSION,
    baselineWeeklyVolume: null,
    peakObservedBaselineWeeklyVolume: 0,
    calibrationSamples: 0,
    cumulativeNormalizedVolume: 0,
    competitionOffsetPoints: 0,
    officialRankIndex: 0,
    consecutiveBelowRankWeeks: 0,
    lastSettledWeekId: null,
  };
}

/** A declaration is one provisional observation, capped at Master entry volume. */
export function createDeclaredEffortState(sport: Sport, declaredWeeklyVolume: number): EffortState {
  nonnegative(declaredWeeklyVolume, 'declaredWeeklyVolume');
  const baselineWeeklyVolume = Math.min(declaredWeeklyVolume, SPORT_CONFIG[sport].anchors[6]);
  const s = { ...createEmptyEffortState(), baselineWeeklyVolume, calibrationSamples: 1 };
  // Do not treat self-reported volume as a verified personal best.
  return { ...s, officialRankIndex: getScoreBreakdown(sport, s).scoreBasedRankIndex };
}

export function getScoreBreakdown(sport: Sport, state: EffortState): ScoreBreakdown {
  const position = state.baselineWeeklyVolume === null ? 0 : trainingPosition(sport, state.baselineWeeklyVolume);
  const historyPoints = historicalBonusPoints(state.cumulativeNormalizedVolume);
  const competitionPoints = state.competitionOffsetPoints;
  const trainingPoints = POINTS_PER_RANK * position;
  const displayedScore = Math.round(Math.max(0, trainingPoints + historyPoints + competitionPoints));
  const scoreBasedRankIndex = Math.min(8, Math.floor(displayedScore / POINTS_PER_RANK));
  return {
    trainingPosition: position,
    historyPoints,
    competitionPoints,
    trainingPoints,
    displayedScore,
    scoreBasedRankIndex,
    scoreBasedRank: RANK_NAMES[scoreBasedRankIndex],
    officialRank: RANK_NAMES[state.officialRankIndex],
  };
}

/**
 * Normalized placement reward for N players.
 * For N=8: [100,75,50,30,15,0,-15,-30].
 * For any N>=2: interpolate the same 0-100% rank curve.
 * A tie receives the average reward across its occupied places.
 */
export function placementRewardPoints(input: CompetitionInput): number {
  const { participants, yourParticipantId } = input;
  if (participants.length < MIN_RATED_FIELD) return 0;
  const ids = new Set<string>();
  for (const p of participants) {
    if (!p.participantId || ids.has(p.participantId)) throw new Error('empty or duplicate participantId');
    ids.add(p.participantId);
    nonnegative(p.eligibleEventVolume, 'eligibleEventVolume');
  }
  const yours = participants.find(p => p.participantId === yourParticipantId);
  if (!yours) throw new Error('yourParticipantId is not in the event');
  // No competitive distinction: all participants tie, so the battle bonus is neutral.
  if (participants.every(p => p.eligibleEventVolume === yours.eligibleEventVolume)) return 0;
  const ahead = participants.filter(p => p.eligibleEventVolume > yours.eligibleEventVolume).length;
  const tied = participants.filter(p => p.eligibleEventVolume === yours.eligibleEventVolume).length;
  const awardAtPlace = (place: number): number => {
    const index = 7 * (place - 1) / (participants.length - 1);
    const low = Math.min(7, Math.floor(index));
    const high = Math.min(7, low + 1);
    return EIGHT_PLAYER_REWARDS[low] + (EIGHT_PLAYER_REWARDS[high] - EIGHT_PLAYER_REWARDS[low]) * (index - low);
  };
  let sum = 0;
  for (let i = ahead + 1; i <= ahead + tied; i++) sum += awardAtPlace(i);
  return sum / tied;
}

/** Week IDs must be valid Gregorian Monday dates, with no skipped settlements. */
function mondayUtcMs(weekId: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekId)) throw new Error('weekId must be YYYY-MM-DD');
  const [year, month, day] = weekId.split('-').map(Number);
  const ms = Date.UTC(year, month - 1, day);
  const d = new Date(ms);
  if (d.toISOString().slice(0, 10) !== weekId || d.getUTCDay() !== 1) throw new Error('weekId must be a valid Monday date');
  return ms;
}

/**
 * Settle exactly one complete Monday-Monday week. Any absent activity = zero.
 * Call once per week per sport within an atomic server transaction.
 */
export function settleEffortWeek(sport: Sport, prior: EffortState, input: WeeklyInput): WeeklyResult {
  const ms = mondayUtcMs(input.weekId);
  const eligibleWeeklyVolume = trainingVolumeForXp(sport, input.eligibleTrainingXp);
  const before = getScoreBreakdown(sport, prior);
  if (prior.lastSettledWeekId === input.weekId) {
    return { state: prior, before, after: before, scoreDelta: 0,
      placementRewardPoints: 0, rankChange: 'unchanged', idempotentReplay: true };
  }
  if (prior.lastSettledWeekId !== null && ms - mondayUtcMs(prior.lastSettledWeekId) !== 7 * 86_400_000) {
    throw new Error('non-contiguous settlement: settle intervening weeks (including zero weeks) or replay history');
  }

  const baseline = updateEffortBaseline(sport, prior, eligibleWeeklyVolume);
  const q = prior.cumulativeNormalizedVolume + eligibleWeeklyVolume / SPORT_CONFIG[sport].referenceVolume;
  const placementReward = input.competition ? placementRewardPoints(input.competition) : (input.placementReward ?? 0);
  if(!Number.isFinite(placementReward) || placementReward < -30 || placementReward > 100) throw new Error("invalid_placement_reward");
  const competitionOffsetPoints = COMPETITION_RETENTION * prior.competitionOffsetPoints + placementReward;
  const baseState: EffortState = {
    ...prior, baselineWeeklyVolume: baseline,
    peakObservedBaselineWeeklyVolume: Math.max(prior.peakObservedBaselineWeeklyVolume, baseline),
    calibrationSamples: Math.min(7, prior.calibrationSamples + 1),
    cumulativeNormalizedVolume: q,
    competitionOffsetPoints,
    lastSettledWeekId: input.weekId,
  };
  const targetRank = getScoreBreakdown(sport, baseState).scoreBasedRankIndex;
  let officialRankIndex = prior.officialRankIndex;
  let consecutiveBelowRankWeeks = 0;
  if (targetRank > officialRankIndex) {
    officialRankIndex = targetRank;
  } else if (targetRank < officialRankIndex) {
    consecutiveBelowRankWeeks = prior.consecutiveBelowRankWeeks + 1;
    if (consecutiveBelowRankWeeks >= DEMOTION_CONFIRMATION_WEEKS) {
      officialRankIndex = targetRank;
      consecutiveBelowRankWeeks = 0;
    }
  }
  const state: EffortState = { ...baseState, officialRankIndex, consecutiveBelowRankWeeks };
  const after = getScoreBreakdown(sport, state);
  return {
    state, before, after,
    scoreDelta: after.displayedScore - before.displayedScore,
    placementRewardPoints: placementReward,
    rankChange: officialRankIndex > prior.officialRankIndex ? 'promoted'
      : officialRankIndex < prior.officialRankIndex ? 'demoted' : 'unchanged',
    idempotentReplay: false,
  };
}

/** Import complete, consecutive Monday weeks; activity and weekly zeros are canonicalized upstream. */
export function createImportedEffortState(
  sport: Sport, weeks: readonly {weekId: string; eligibleTrainingXp: number}[],
): EffortState {
  let s = createEmptyEffortState();
  for (const w of [...weeks].sort((a,b) => a.weekId.localeCompare(b.weekId))) {
    s = settleEffortWeek(sport, s, w).state;
  }
  return { ...s, officialRankIndex: getScoreBreakdown(sport,s).scoreBasedRankIndex, consecutiveBelowRankWeeks: 0 };
}

/** Shared by previews and settlement; does not mutate the frozen input state. */
export function updateEffortBaseline(sport: Sport, prior: EffortState, volume: number): number {
  nonnegative(volume, "volume");
  let baseline: number;
  if (prior.baselineWeeklyVolume === null) {
    baseline = volume;
  } else {
    const provisional = prior.calibrationSamples < 7;
    if (provisional) {
      const alpha = 1 / Math.min(7, prior.calibrationSamples + 1);
      baseline = prior.baselineWeeklyVolume + alpha * (volume - prior.baselineWeeklyVolume);
    } else if (volume <= prior.baselineWeeklyVolume) {
      baseline = prior.baselineWeeklyVolume + (volume - prior.baselineWeeklyVolume) / DOWNWARD_EWMA_DENOMINATOR;
    } else if (prior.baselineWeeklyVolume < prior.peakObservedBaselineWeeklyVolume - 1e-8) {
      // Returning to verified prior training: fast, but never leap above the old high.
      baseline = Math.min(prior.peakObservedBaselineWeeklyVolume,
        prior.baselineWeeklyVolume + (volume - prior.baselineWeeklyVolume) / RECOVERY_EWMA_DENOMINATOR);
    } else {
      // Above the established Master volume, new all-time highs must be sustained.
      const eliteEntry = SPORT_CONFIG[sport].anchors[6];
      const denominator = prior.baselineWeeklyVolume >= eliteEntry
        ? NEW_ELITE_BEST_EWMA_DENOMINATOR : UPWARD_EWMA_DENOMINATOR;
      baseline = prior.baselineWeeklyVolume + (volume - prior.baselineWeeklyVolume) / denominator;
    }
  }
  return baseline;
}

export interface LiveEffortInput {
  now: Date;
  trainingXpBeforeToday: number;
  trainingXpToday: number;
}

export function calculateLiveEffortScore(sport: Sport, frozen: EffortState, input: LiveEffortInput) {
  const { now } = input;
  const a = trainingVolumeForXp(sport, input.trainingXpBeforeToday);
  const d = trainingVolumeForXp(sport, input.trainingXpToday);
  if (!Number.isFinite(now.getTime())) throw new Error('invalid_live_time');
  const k = (getZonedWeekday(now) + 6) % 7;
  const forecast = frozen.baselineWeeklyVolume ?? 0;
  const preview = (volume: number, observed: number) => getScoreBreakdown(sport, {
    ...frozen,
    baselineWeeklyVolume: updateEffortBaseline(sport, frozen, volume),
    cumulativeNormalizedVolume: frozen.cumulativeNormalizedVolume + observed / SPORT_CONFIG[sport].referenceVolume,
  }).displayedScore;
  const morningProjectedVolume = a + (7 - k) / 7 * forecast;
  const activityProjectedVolume = a + d + (6 - k) / 7 * forecast;
  const morningScore = preview(morningProjectedVolume, a);
  const activityScore = preview(activityProjectedVolume, a + d);
  const liveScore = Math.max(morningScore, activityScore);
  return {
    settledScore: getScoreBreakdown(sport, frozen).displayedScore,
    liveScore, morningScore, activityScore, morningProjectedVolume, activityProjectedVolume,
    officialRank: RANK_NAMES[frozen.officialRankIndex],
    liveIsProvisional: true,
    currentDayGain: Math.max(0, liveScore - morningScore),
    weekStartLocalDate: dayKey(weeklyPeriodBounds(now).startsAt),
    localDayStart: startOfZonedDay(now).toISOString(), scoringVersion: SCORING_VERSION,
  };
}
