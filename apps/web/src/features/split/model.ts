import {
  APP_TIMEZONE,
  activityCheckpoints,
  competeNow,
  effortTrackMax,
  formatEffort,
  ghostEffortAt as effortAtGhost,
  ghostHasVolume,
  initialsFromName,
  interpolateSeries,
  resolvePastSelfGhost,
  syntheticCheckpoints,
  waveWindowAt,
  weeklyBoard,
  type BoardRow,
  type CheckpointIndex,
  type CheckpointSeries,
  type CompeteState,
  type GhostPeriodSelector,
  type GhostReference,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";

export type ComparisonMode = "self" | "field";

export interface TrackLane {
  id: string;
  name: string;
  initials: string;
  effort: number;
  checkpoints: [number, number, number];
  you?: boolean;
  ghost?: boolean;
  place?: number;
}

export interface SplitBoardModel {
  sport: SportId;
  track: ScoreTrack;
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date;
  optedIn: boolean;
  rows: BoardRow[];
  you: BoardRow | null;
  youSeries: CheckpointSeries;
  /** Past-self (or other) ghost for the selected prior window. */
  ghost: GhostReference;
  /** Convenience: `ghost.series` when the window has countable volume. */
  ghostSeries: CheckpointSeries | null;
  ghostEffortAt: (checkpoint: number) => number;
  nearby: TrackLane[];
  fieldLanes: TrackLane[];
  trackMax: number;
  checkpointLabels: [string, string, string];
  weekActivities: CompeteState["activities"];
}

export interface BuildSplitBoardOptions {
  /** Default: immediately previous equal-length period (last week). */
  ghostSelector?: GhostPeriodSelector;
}

function waveBoundsForSport(state: CompeteState, sport: SportId, now: Date) {
  const enrollment = state.enrollments.find((item) => item.sport === sport);
  if (enrollment) {
    return {
      startsAt: new Date(enrollment.waveStart),
      endsAt: new Date(enrollment.weekEnd),
    };
  }
  const wave = waveWindowAt(now);
  return { startsAt: wave.waveStart, endsAt: wave.weekEnd };
}

export function buildSplitBoard(
  state: CompeteState,
  sport: SportId,
  track: ScoreTrack,
  now: Date = competeNow(state),
  options: BuildSplitBoardOptions = {},
): SplitBoardModel {
  const period = waveBoundsForSport(state, sport, now);
  const rating = state.ratings.find((item) => item.sport === sport);
  const optedIn = Boolean(rating?.optedIn);
  const rows = optedIn ? weeklyBoard(state, sport, track, now) : [];
  const you = rows.find((row) => row.you) ?? null;

  const youSeries = activityCheckpoints(
    state.activities,
    sport,
    period.startsAt,
    period.endsAt,
    track,
    now,
  );

  const ghost = resolvePastSelfGhost({
    activities: state.activities,
    sport,
    track,
    currentStart: period.startsAt,
    currentEnd: period.endsAt,
    currentLiveAt: youSeries.liveAt,
    selector: options.ghostSelector,
    periodKind: state.clock.kind,
  });
  const ghostSeries = ghostHasVolume(ghost) ? ghost.series : null;

  const nearbyRows = (() => {
    if (!you) return rows.slice(0, 3);
    const index = rows.findIndex((row) => row.you);
    const start = Math.max(0, index - 1);
    return rows.slice(start, start + 3);
  })();

  const fieldLanes: TrackLane[] = rows.map((row) => {
    const series = row.you
      ? youSeries
      : syntheticCheckpoints(
          row.effort,
          row.distanceM,
          row.movingSec,
          row.id,
          period.startsAt,
          period.endsAt,
          now,
        );
    return {
      id: row.id,
      name: row.you ? "Your week" : row.name,
      initials: row.you ? initialsFromName(state.name) : initialsFromName(row.name),
      effort: row.effort,
      checkpoints: series.effort,
      you: row.you,
      place: row.place,
    };
  });

  const nearby: TrackLane[] = nearbyRows.map(
    (row) => fieldLanes.find((lane) => lane.id === row.id)!,
  );

  const trackMax = effortTrackMax([
    ...fieldLanes.map((lane) => lane.effort),
    ...(ghostSeries ? ghostSeries.effort : []),
  ]);

  return {
    sport,
    track,
    periodLabel: `${period.startsAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: APP_TIMEZONE,
    })}–${new Date(period.endsAt.getTime() - 1).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: APP_TIMEZONE,
    })}`,
    periodStart: period.startsAt,
    periodEnd: period.endsAt,
    optedIn,
    rows,
    you,
    youSeries,
    ghost,
    ghostSeries,
    ghostEffortAt: (checkpoint: number) => effortAtGhost(ghost, checkpoint),
    nearby,
    fieldLanes,
    trackMax,
    checkpointLabels: youSeries.labels,
    weekActivities: state.activities
      .filter((activity) => {
        if (activity.sport !== sport) return false;
        if (track === "verified" && !activity.verified) return false;
        const at = new Date(activity.startedAt);
        return at >= period.startsAt && at < period.endsAt;
      })
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
  };
}

export function laneAtCheckpoint(
  lane: TrackLane,
  checkpoint: CheckpointIndex | number,
): number {
  return interpolateSeries(lane.checkpoints, checkpoint);
}

export function formatPts(value: number): string {
  return formatEffort(value);
}

export function deltaCopy(
  youEffort: number,
  ghostEffort: number,
  ghostLabel = "your previous week",
): { delta: number; headline: string; detail: string } {
  const delta = Math.round((youEffort - ghostEffort) * 10) / 10;
  if (ghostEffort <= 0) {
    return {
      delta,
      headline: "Your line this week.",
      detail: `No counted work in ${ghostLabel} at this cutoff.`,
    };
  }
  if (Math.abs(delta) < 0.05) {
    return {
      delta: 0,
      headline: `Level with ${ghostLabel}.`,
      detail: "Same cutoff. Same effort points so far.",
    };
  }
  if (delta > 0) {
    return {
      delta,
      headline: "points ahead of your own week.",
      detail: "Same point in the week. A little more movement in the books.",
    };
  }
  return {
    delta,
    headline: `points behind ${ghostLabel}.`,
    detail: "Same cutoff. Room to catch your own line.",
  };
}
