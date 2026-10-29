import { periodEffort } from "./effort";
import {
  ELO_CAP,
  sportById,
  type CompeteState,
  type ScoreTrack,
  type SportId,
} from "./sports";

/** Durable high-water receipt: removing/re-adding a workout never re-awards points. */
export interface EffortMilestone {
  sport: SportId;
  track: ScoreTrack;
  periodStart: string;
  periodEnd: string;
  step: number;
  earned: number;
}

/** Rank at entry fixes the price for the whole round. GPS units are meters; strength seconds. */
export function milestoneStep(sport: SportId, score: number): number {
  const multiplier =
    score < 800
      ? 1
      : score < 1000
        ? 1.5
        : score < 1200
          ? 2
          : score < 1400
            ? 2.5
            : score < 1600
              ? 3
              : score < 1800
                ? 4
                : 5;
  return (
    (sport === "cycling"
      ? 5 * 1609.344
      : sport === "strength"
        ? 1800
        : 1609.344) * multiplier
  );
}

export function applyEffortMilestones(
  state: CompeteState,
  now: Date,
): CompeteState {
  const receipts = [...(state.effortMilestones ?? [])];
  let changed = false;
  const ratings = state.ratings.map((rating) => {
    const enrollment = state.enrollments.find(
      (item) => item.sport === rating.sport,
    );
    if (
      !rating.optedIn ||
      !enrollment ||
      Date.parse(enrollment.waveStart) > now.getTime()
    )
      return rating;
    let next = rating;
    for (const track of ["open", "verified"] as const) {
      if (track === "verified" && !sportById(rating.sport).gps) continue;
      const start = new Date(enrollment.waveStart).toISOString();
      const index = receipts.findIndex(
        (r) =>
          r.sport === rating.sport &&
          r.track === track &&
          r.periodStart === start,
      );
      const previous = receipts[index];
      const step =
        previous?.step ??
        milestoneStep(
          rating.sport,
          track === "open" ? rating.lockOpen : rating.lockVerified,
        );
      const totals = periodEffort(
        enrollment.scoringActivities ?? state.activities,
        rating.sport,
        new Date(start),
        new Date(Math.min(Date.parse(enrollment.weekEnd), now.getTime() + 1)),
        track,
      );
      const volume =
        rating.sport === "strength" ? totals.movingSec : totals.distanceM;
      const earned = Math.max(
        previous?.earned ?? 0,
        Math.floor(Math.max(0, volume) / step),
      );
      if (previous && earned === previous.earned) continue;
      const receipt: EffortMilestone = {
        sport: rating.sport,
        track,
        periodStart: start,
        periodEnd: enrollment.weekEnd,
        step,
        earned,
      };
      if (index >= 0) receipts[index] = receipt;
      else receipts.push(receipt);
      const key = track === "open" ? "openElo" : "verifiedElo";
      next = {
        ...next,
        [key]: Math.min(ELO_CAP, next[key] + earned - (previous?.earned ?? 0)),
      };
      changed = true;
    }
    return next;
  });
  return changed ? { ...state, ratings, effortMilestones: receipts } : state;
}

export function currentEffortMilestone(
  state: CompeteState,
  sport: SportId,
  track: ScoreTrack,
) {
  const rating = state.ratings.find((r) => r.sport === sport),
    enrollment = state.enrollments.find((e) => e.sport === sport);
  if (
    !rating?.optedIn ||
    !enrollment ||
    (track === "verified" && !sportById(sport).gps)
  )
    return null;
  return (
    state.effortMilestones?.find(
      (r) =>
        r.sport === sport &&
        r.track === track &&
        Date.parse(r.periodStart) === Date.parse(enrollment.waveStart),
    ) ?? {
      step: milestoneStep(
        sport,
        track === "open" ? rating.lockOpen : rating.lockVerified,
      ),
      earned: 0,
    }
  );
}
