import {
  APP_TIMEZONE,
  activityCheckpoints,
  competeNow,
  resolvePastSelfGhost,
  waveWindowAt,
  weeklyBoard,
  type BoardRow,
  type CheckpointSeries,
  type CompeteState,
  type GhostPeriodSelector,
  type GhostReference,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";

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

  const enrollment = state.enrollments.find(item => item.sport === sport);
  const youSeries = activityCheckpoints(
    enrollment?.scoringActivities ?? state.activities,
    sport,
    period.startsAt,
    period.endsAt,
    track,
    now,
    state.dailyHealth,
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
