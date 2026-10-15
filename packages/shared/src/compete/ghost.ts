import type { PeriodKind } from "../types";
import { periodEffort } from "./effort";
import type { Activity, ScoreTrack, SportId } from "./sports";
import {
  activityCheckpoints,
  interpolateSeries,
  type CheckpointSeries,
} from "./track";

/**
 * Who/what a ghost represents. Extend later (e.g. rival snapshots) without
 * changing standings row shapes — ghosts are never ranked into live boards.
 */
export type GhostSubject = "past_self";

/**
 * How the ghost period window was chosen.
 * - `prior`: shift the current half-open window back by N equal spans
 * - `bounds`: an arbitrary half-open [startsAt, endsAt) the caller already has
 */
export type GhostPeriodSelector =
  | { mode: "prior"; periodsAgo: number }
  | { mode: "bounds"; startsAt: Date; endsAt: Date };

/** Generic ghost / past-self reference used by leaderboard, matchup, and track UIs. */
export interface GhostReference {
  id: string;
  subject: GhostSubject;
  /** Always false — ghosts are comparison overlays, not standings rows. */
  inStandings: false;
  name: string;
  initials: string;
  periodStart: Date;
  periodEnd: Date;
  selector: GhostPeriodSelector;
  /** Null when there is no countable volume in the ghost window. */
  series: CheckpointSeries | null;
}

export const DEFAULT_GHOST_SELECTOR: GhostPeriodSelector = {
  mode: "prior",
  periodsAgo: 1,
};

const MIN_GHOST_EFFORT = 0.01;

/** Shift a half-open period window by an integer number of equal spans. */
export function shiftedPeriodBounds(
  currentStart: Date,
  currentEnd: Date,
  periodsAgo: number,
): { startsAt: Date; endsAt: Date } {
  if (!Number.isFinite(periodsAgo) || periodsAgo < 1) {
    throw new Error("ghost_periods_ago_must_be_positive");
  }
  const span = currentEnd.getTime() - currentStart.getTime();
  if (!(span > 0)) {
    throw new Error("ghost_period_requires_positive_span");
  }
  const shift = periodsAgo * span;
  return {
    startsAt: new Date(currentStart.getTime() - shift),
    endsAt: new Date(currentEnd.getTime() - shift),
  };
}

/** Resolve the half-open window for a selector against the live period. */
export function resolveGhostPeriodBounds(
  currentStart: Date,
  currentEnd: Date,
  selector: GhostPeriodSelector = DEFAULT_GHOST_SELECTOR,
): { startsAt: Date; endsAt: Date; selector: GhostPeriodSelector } {
  if (selector.mode === "bounds") {
    if (!(selector.endsAt > selector.startsAt)) {
      throw new Error("ghost_bounds_require_ends_after_starts");
    }
    return {
      startsAt: new Date(selector.startsAt),
      endsAt: new Date(selector.endsAt),
      selector: {
        mode: "bounds",
        startsAt: new Date(selector.startsAt),
        endsAt: new Date(selector.endsAt),
      },
    };
  }
  const bounds = shiftedPeriodBounds(
    currentStart,
    currentEnd,
    selector.periodsAgo,
  );
  return {
    ...bounds,
    selector: { mode: "prior", periodsAgo: selector.periodsAgo },
  };
}

/** Map a selector + period kind to human labels (default: previous week). */
export function ghostDisplayName(
  selector: GhostPeriodSelector,
  periodKind: PeriodKind = "weekly",
): { name: string; initials: string } {
  if (selector.mode === "bounds") {
    const start = selector.startsAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    const endExclusive = new Date(selector.endsAt.getTime() - 1);
    const end = endExclusive.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    return { name: `Past you (${start}–${end})`, initials: "PY" };
  }

  const n = selector.periodsAgo;
  if (n === 1) {
    switch (periodKind) {
      case "daily":
        return { name: "Your previous day", initials: "PD" };
      case "monthly":
        return { name: "Your previous month", initials: "PM" };
      case "custom":
        return { name: "Your previous period", initials: "PP" };
      default:
        return { name: "Your previous week", initials: "PW" };
    }
  }

  const unit =
    periodKind === "daily"
      ? "days"
      : periodKind === "monthly"
        ? "months"
        : periodKind === "custom"
          ? "periods"
          : "weeks";
  return { name: `${n} ${unit} ago`, initials: `P${Math.min(n, 9)}` };
}

export function ghostReferenceId(periodStart: Date): string {
  return `ghost:past_self:${periodStart.toISOString()}`;
}

/**
 * Align "now" inside the ghost window to the same elapsed offset as the live
 * week, so scrubbers compare same-cutoff progress.
 */
export function alignedGhostNow(
  ghostStart: Date,
  currentStart: Date,
  currentLiveAt: Date,
): Date {
  return new Date(
    ghostStart.getTime() +
      (currentLiveAt.getTime() - currentStart.getTime()),
  );
}

export function ghostHasVolume(ghost: GhostReference | null | undefined): boolean {
  if (!ghost?.series) return false;
  return ghost.series.effort[2]! > MIN_GHOST_EFFORT;
}

export function ghostEffortAt(
  ghost: GhostReference | null | undefined,
  checkpoint: number,
): number {
  if (!ghost?.series) return 0;
  return interpolateSeries(ghost.series.effort, checkpoint);
}

export interface ResolvePastSelfGhostInput {
  activities: Activity[];
  sport: SportId;
  track: ScoreTrack;
  currentStart: Date;
  currentEnd: Date;
  /** Live cutoff inside the current period (usually youSeries.liveAt). */
  currentLiveAt: Date;
  selector?: GhostPeriodSelector;
  periodKind?: PeriodKind;
  minEffort?: number;
}

/**
 * Build a past-self ghost for an arbitrary prior window. Default selector is
 * the immediately previous equal-length period (last week for weekly battles).
 */
export function resolvePastSelfGhost(
  input: ResolvePastSelfGhostInput,
): GhostReference {
  const selector = input.selector ?? DEFAULT_GHOST_SELECTOR;
  const periodKind = input.periodKind ?? "weekly";
  const minEffort = input.minEffort ?? MIN_GHOST_EFFORT;
  const { startsAt, endsAt, selector: resolvedSelector } =
    resolveGhostPeriodBounds(input.currentStart, input.currentEnd, selector);
  const labels = ghostDisplayName(resolvedSelector, periodKind);

  const volume = periodEffort(
    input.activities,
    input.sport,
    startsAt,
    endsAt,
    input.track,
  );

  const series =
    volume.effort > minEffort
      ? activityCheckpoints(
          input.activities,
          input.sport,
          startsAt,
          endsAt,
          input.track,
          alignedGhostNow(startsAt, input.currentStart, input.currentLiveAt),
        )
      : null;

  return {
    id: ghostReferenceId(startsAt),
    subject: "past_self",
    inStandings: false,
    name: labels.name,
    initials: labels.initials,
    periodStart: startsAt,
    periodEnd: endsAt,
    selector: resolvedSelector,
    series,
  };
}
