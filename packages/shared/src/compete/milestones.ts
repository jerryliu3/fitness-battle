import type { SportId, ScoreTrack } from "./sports";
/** Historical migration receipt shape; never used to award Effort Score. */
export interface EffortMilestone {
  sport: SportId;
  track: ScoreTrack;
  periodStart: string;
  periodEnd: string;
  step: number;
  earned: number;
}
