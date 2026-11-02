import { countsOnTrack } from "./compete/ledger";
import { weeklyPeriodBounds, APP_TIMEZONE, getZonedWeekday } from "./period";
import { competitionTrack, sportById } from "./compete/sports";
import { formatClockTime } from "./compete/pace";
import { formatVolume, formatEffort, type BoardRow } from "./compete/engine";
import { formatEloDelta } from "./compete/history";
import { ordinalPlace } from "./arena-view";
import { competeNow } from "./compete/engine";
import { trainingBuckets } from "./training-view";
import { RANK_BANDS, eloInBand, type RankBand } from "./compete/ranks";
import { RECORD_DISTANCES, personalRecordHistory } from "./compete/progress";
import { weeklyActivityStreak } from "./weekly-streak";
import type { CompeteState, PeriodResult, ScoreTrack, SportId, UnitSystem } from "./compete/sports";

/** Calendar-week presentation only; does not change competition enrollment bounds. */
export function clubWeekSummary(state: CompeteState, now = competeNow(state)) {
  const bounds = weeklyPeriodBounds(now);
  const weekday = getZonedWeekday(now, APP_TIMEZONE);
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  const daysPassed = Math.min(7, Math.max(1, daysFromMonday + 1));
  const previous = trainingBuckets(
    state.activities,
    "all",
    "week",
    new Date(bounds.startsAt.getTime() - 1),
    now,
  );
  const days = trainingBuckets(state.activities, "all", "week", now, now);
  const total = (rows: typeof days) =>
    rows.reduce((n, row) => n + row.movingSec, 0);
  const currentDays = days.slice(0, daysPassed);
  const previousDays = previous.slice(0, daysPassed);
  return {
    movingSec: total(currentDays),
    sessions: currentDays.reduce((n, row) => n + row.sessions, 0),
    activeDays: currentDays.filter((row) => row.sessions > 0).length,
    daysPassed,
    previousSec: total(previousDays),
    firstName: state.name.trim().split(/\s+/)[0] || "athlete",
    greeting:
      Number(
        new Intl.DateTimeFormat("en-US", {
          timeZone: APP_TIMEZONE,
          hour: "numeric",
          hourCycle: "h23",
        }).format(now),
      ) < 12
        ? "Good morning"
        : Number(
              new Intl.DateTimeFormat("en-US", {
                timeZone: APP_TIMEZONE,
                hour: "numeric",
                hourCycle: "h23",
              }).format(now),
            ) < 18
          ? "Good afternoon"
          : "Good evening",
  };
}
export function clubDuration(seconds: number): string {
  const minutes = Math.round(Math.max(0, seconds) / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes}m`;
}

/** Next athlete ahead, or the closest trailing place when leading. Only ranked board rows enter here. */
export function nextClubRival(
  rows: readonly import("./compete/engine").BoardRow[],
) {
  const you = rows.find((row) => row.you);
  const ahead = you
    ? rows
        .filter((row) => !row.you && row.place < you.place)
        .sort((a, b) => b.place - a.place)[0]
    : undefined;
  const tied = you ? rows.find(row => !row.you && row.place === you.place) : undefined;
  const rival = tied ?? ahead ?? (you
    ? rows.filter(row => !row.you && row.place > you.place).sort((a, b) => a.place - b.place)[0]
    : undefined);
  return { you, rival, fieldSize: rows.length };
}

/** Shared Home copy only; never changes standings or competition values. */
export function clubRivalCardSummary(rows: readonly BoardRow[], sport: SportId | undefined, units: UnitSystem, syntheticIds: readonly string[] = []) {
  const { you, rival } = nextClubRival(rows);
  const place = you ? ordinalPlace(you.place) : null;
  if (!you || !rival || !sport) return {
    place,
    headline: you ? "You’re leading the way." : "Your next chapter starts here.",
    caption: you ? "Keep showing up. Every effort counts." : "Register for a weekly event.",
  };
  const distance = sportById(sport).gps;
  const delta = distance ? rival.distanceM - you.distanceM : rival.effort - you.effort;
  const gap = Math.abs(delta);
  const amount = distance
    ? gap > 0 && gap < (units === "metric" ? 50 : 80.4672)
      ? units === "metric" ? `${Math.max(1, Math.round(gap))} m` : `${Math.max(1, Math.round(gap / .3048))} ft`
      : formatVolume(sport, gap, 0, units)
    : gap > 0 && gap < .05 ? "<0.1 pts" : `${formatEffort(gap)} pts`;
  const name = rival.name.trim().split(/\s+/)[0] || "your rival";
  const label = rival.place < you.place ? "Next rival" : "Closest rival";
  return {
    place,
    headline: delta === 0 ? `Level with ${name}` : `${amount} ${delta > 0 ? "behind" : "ahead of"} ${name}`,
    caption: `${label} in your field`,
  };
}

export function latestClubRecap(state: CompeteState, now = competeNow(state)) {
  return state.periodResults
    .filter(
      (row) =>
        Date.parse(row.periodEnd) <= now.getTime(),
    )
    .sort(
      (a, b) =>
        Date.parse(b.periodEnd) - Date.parse(a.periodEnd) ||
        Number(b.sport === state.primary) - Number(a.sport === state.primary) ||
        Number(b.track === competitionTrack(b.sport)) - Number(a.track === competitionTrack(a.sport)) ||
        a.id.localeCompare(b.id),
    )[0];
}

export interface ClubAchievement {
  id: string;
  title: string;
  category: "sessions" | "effort";
  target: number;
  current: number;
  earned: boolean;
  fraction: number;
}

export function achievementProgressPercent(fraction: number): number {
  return Math.round(Math.max(0, Math.min(1, fraction)) * 100);
}

export function achievementAccessibilityLabel(row: ClubAchievement): string {
  const unit =
    row.category === "sessions" ? "sessions" : "Open effort score";
  const status = row.earned ? "Earned" : "In progress";
  return `${row.title}. ${row.current} of ${row.target} ${unit}. ${status}`;
}
/** Read-only milestones from available counted activity and the primary sport's Open rating. */
export function clubAchievements(
  state: CompeteState,
  now = competeNow(state),
): ClubAchievement[] {
  const sessions = state.activities.filter(
    (a) =>
      countsOnTrack(a, "open") &&
      Number.isFinite(Date.parse(a.startedAt)) &&
      Date.parse(a.startedAt) <= now.getTime(),
  ).length;
  const score =
    state.ratings.find((r) => r.sport === state.primary)?.openElo ?? 0;
  return [
    {
      id: "first-session",
      title: "First of many",
      category: "sessions" as const,
      target: 1,
    },
    {
      id: "ten-sessions",
      title: "Finding your rhythm",
      category: "sessions" as const,
      target: 10,
    },
    {
      id: "fifty-sessions",
      title: "Showing up",
      category: "sessions" as const,
      target: 50,
    },
    {
      id: "effort-750",
      title: "Building momentum",
      category: "effort" as const,
      target: 750,
    },
    {
      id: "effort-1000",
      title: "A thousand strong",
      category: "effort" as const,
      target: 1000,
    },
    {
      id: "effort-1500",
      title: "Raising the bar",
      category: "effort" as const,
      target: 1500,
    },
  ].map((item) => {
    const current = item.category === "sessions" ? sessions : score;
    return {
      ...item,
      current,
      earned: current >= item.target,
      fraction: Math.max(0, Math.min(1, current / item.target)),
    };
  });
}
export function featuredClubAchievements(rows: ClubAchievement[]) {
  return [
    rows.find(
      (r) => r.id === (rows[1]?.earned ? "ten-sessions" : "first-session"),
    ),
    [...rows].reverse().find((r) => r.category === "effort" && r.earned) ??
      rows[3],
    rows[2],
  ].filter(
    (row, index, items): row is ClubAchievement =>
      Boolean(row) && items.findIndex((item) => item?.id === row?.id) === index,
  );
}

export function clubSessionMetrics(
  activities: import("./compete/sports").Activity[],
  units: import("./compete/sports").UnitSystem,
) {
  const single = activities.length === 1 ? activities[0] : undefined;
  if (!single) return [];
  const distance = single.distanceM / (units === "metric" ? 1000 : 1609.344);
  const pace =
    distance > 0 && single.movingSec > 0
      ? Math.round(single.movingSec / distance)
      : 0;
  return [
    ...(sportById(single.sport).gps
      ? [
          {
            label: "Distance",
            value: formatVolume(
              single.sport,
              single.distanceM,
              single.movingSec,
              units,
            ),
          },
        ]
      : []),
    { label: "Moving time", value: formatClockTime(single.movingSec) },
    ...(sportById(single.sport).gps && pace > 0
      ? [
          {
            label: single.sport === "cycling" ? "Time / unit" : "Pace",
            value: `${formatClockTime(pace)}/${units === "metric" ? "km" : "mi"}`,
          },
        ]
      : []),
  ];
}

/** Available lifetime activity only; count each completed primary-sport round once across historical tracks. */
export function clubLifetimeTotals(state: CompeteState, now = competeNow(state)) {
  const counted = state.activities.filter(a => countsOnTrack(a, "open") &&
    Number.isFinite(Date.parse(a.startedAt)) && Date.parse(a.startedAt) <= now.getTime());
  const rounds = new Set(state.periodResults.filter(r => r.sport === state.primary &&
    Number.isFinite(Date.parse(r.periodStart)) && Date.parse(r.periodEnd) <= now.getTime())
    .map(r => `${r.periodStart}:${r.periodEnd}`));
  return { meters: counted.reduce((n, a) => n + Math.max(0, a.distanceM), 0), sessions: counted.length, weeks: rounds.size };
}

function formatWeekRangeLabel(periodStart: string, periodEnd: string): string {
  const start = new Date(periodStart).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
  const end = new Date(new Date(periodEnd).getTime() - 1).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      timeZone: APP_TIMEZONE,
    },
  );
  return `${start} – ${end}`;
}

export interface SeasonLadderCheckpoint {
  min: number;
  name: string;
  reached: boolean;
  current: boolean;
}

export interface SeasonWeekNode {
  id: string;
  result: PeriodResult;
  rangeLabel: string;
  shortLabel: string;
  sportName: string;
  trackLabel: "GPS" | "Open";
  place: number;
  fieldSize: number;
  eloBefore: number;
  eloAfter: number;
  delta: number;
  deltaLabel: string;
  volumeLabel: string;
  effortLabel: string;
  headline: string;
  frozen: boolean;
}

export interface SeasonPassModel {
  sport: SportId;
  sportName: string;
  track: ScoreTrack;
  score: number;
  band: RankBand;
  nextBand: RankBand | null;
  intoNext: number;
  bandProgress: number;
  ladderProgress: number;
  checkpoints: SeasonLadderCheckpoint[];
  weekNodes: SeasonWeekNode[];
  settledWeeksCount: number;
  winsCount: number;
  podiumsCount: number;
}

/** Pure domain model for The Season Pass & Ladder view under Progress -> Effort score. */
export function seasonPassModel(
  state: CompeteState,
  track?: ScoreTrack,
  now = competeNow(state),
): SeasonPassModel {
  const sport = state.primary;
  const sportName = sportById(sport).name;
  const resolvedTrack = track ?? competitionTrack(sport);
  const rating = state.ratings.find((r) => r.sport === sport);
  const score =
    (resolvedTrack === "verified" ? rating?.verifiedElo : rating?.openElo) ??
    1000;
  const { band, next: nextBand, intoNext } = eloInBand(score);
  const bandProgress = nextBand
    ? Math.max(0, Math.min(1, (score - band.min) / Math.max(1, nextBand.min - band.min)))
    : 1;
  const ladderProgress = Math.max(
    0.06,
    Math.min(1, (score - 500) / (2000 - 500)),
  );
  const checkpointMins = [800, 1000, 1200, 1400, 1600] as const;
  const checkpoints: SeasonLadderCheckpoint[] = checkpointMins.map((min) => ({
    min,
    name: RANK_BANDS.find((b) => b.min === min)?.name ?? String(min),
    reached: score >= min,
    current:
      band.min === min ||
      (min === 800 && band.min < 800) ||
      (min === 1600 && band.min >= 1600),
  }));

  const settledAll = state.periodResults
    .filter(
      (r) =>
        Number.isFinite(Date.parse(r.periodEnd)) &&
        Date.parse(r.periodEnd) <= now.getTime(),
    )
    .sort((a, b) => Date.parse(b.periodEnd) - Date.parse(a.periodEnd));

  const primaryTrackRows = settledAll.filter(
    (r) => r.sport === sport && r.track === resolvedTrack,
  );
  const primaryRows = settledAll.filter((r) => r.sport === sport);
  const sourceRows =
    primaryTrackRows.length > 0
      ? primaryTrackRows
      : primaryRows.length > 0
        ? primaryRows
        : settledAll;

  const weekNodes: SeasonWeekNode[] = sourceRows.slice(0, 5).map((row) => {
    const delta = row.eloAfter - row.eloBefore;
    const headline = row.frozen
      ? "Week held"
      : row.place === 1
        ? "Took the field"
        : row.place <= 3
          ? "Podium finish"
          : delta > 0
            ? "Closed up"
            : delta < 0
              ? "Closed down"
              : "Settled even";
    const endDate = new Date(new Date(row.periodEnd).getTime() - 1).toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric", timeZone: APP_TIMEZONE },
    );
    return {
      id: row.id,
      result: row,
      rangeLabel: formatWeekRangeLabel(row.periodStart, row.periodEnd),
      shortLabel: endDate,
      sportName: sportById(row.sport).name,
      trackLabel: row.track === "verified" ? "GPS" : "Open",
      place: row.place,
      fieldSize: row.fieldSize,
      eloBefore: row.eloBefore,
      eloAfter: row.eloAfter,
      delta,
      deltaLabel: formatEloDelta(row.eloBefore, row.eloAfter),
      volumeLabel: formatVolume(row.sport, row.distanceM, row.movingSec, state.units),
      effortLabel: formatEffort(row.effort),
      headline,
      frozen: Boolean(row.frozen),
    };
  });

  const distinctWeeks = new Set(sourceRows.map((r) => r.periodStart)).size;
  const winsCount = sourceRows.filter((r) => r.place === 1).length;
  const podiumsCount = sourceRows.filter((r) => r.place <= 3).length;

  return {
    sport,
    sportName,
    track: resolvedTrack,
    score,
    band,
    nextBand,
    intoNext,
    bandProgress,
    ladderProgress,
    checkpoints,
    weekNodes,
    settledWeeksCount: distinctWeeks,
    winsCount,
    podiumsCount,
  };
}

export interface MomentumRingModel {
  id: "streak" | "sessions" | "rating" | "passes";
  label: string;
  title: string;
  subtitle: string;
  current: number;
  target: number;
  fraction: number;
  percent: number;
  valueLabel: string;
  metricLabel: string;
  tierLabel: string;
  nextTierLabel: string;
  receipt: string;
  earned: boolean;
  accent: "gold" | "teal" | "ink" | "amber";
}

export interface MilestoneBentoCard {
  id: "bento-pb" | "bento-finish";
  badge: string;
  value: string;
  delta: string;
  caption: string;
  title: string;
  subtitle: string;
  tierLabel: string;
  nextTierLabel: string;
  receipt: string;
  dateLabel: string;
  earned: boolean;
  tone: "dark" | "gold";
}

export interface AthleteMomentumModel {
  rings: MomentumRingModel[];
  bentoCards: MilestoneBentoCard[];
  activeRingCount: number;
}

function computeTierTarget(value: number, tiers: readonly number[]) {
  const idx = tiers.findIndex((t) => value < t);
  const target = idx === -1 ? tiers[tiers.length - 1]! : tiers[idx]!;
  const completedTiers = idx === -1 ? tiers.length : idx;
  const fraction = Math.max(0, Math.min(1, value / Math.max(1, target)));
  return {
    target,
    completedTiers,
    fraction,
    percent: Math.round(fraction * 100),
  };
}

/** Pure domain model for Momentum Rings & Bento Wall on Athlete Profile and Achievements. */
export function athleteMomentumModel(
  state: CompeteState,
  now = competeNow(state),
): AthleteMomentumModel {
  const streak = weeklyActivityStreak(state.activities, now);
  const streakTiers = [1, 2, 4, 8, 16, 26, 52] as const;
  const streakStep = computeTierTarget(streak.count, streakTiers);

  const lifetime = clubLifetimeTotals(state, now);
  const sessionTiers = [1, 10, 25, 50, 100, 250, 500] as const;
  const sessionStep = computeTierTarget(lifetime.sessions, sessionTiers);

  const primarySportName = sportById(state.primary).name;
  const openScore =
    state.ratings.find((r) => r.sport === state.primary)?.openElo ?? 1000;
  const { band, next: nextBand, intoNext } = eloInBand(openScore);
  const ratingTarget = nextBand?.min ?? 2000;
  const ratingFraction = nextBand
    ? Math.max(
        0.08,
        Math.min(1, (openScore - band.min) / Math.max(1, ratingTarget - band.min)),
      )
    : 1;
  const ratingPercent = Math.round(ratingFraction * 100);

  const passes = Math.max(0, state.lifetimeOvertakes ?? 0);
  const passTiers = [1, 5, 10, 25, 50, 100, 250] as const;
  const passStep = computeTierTarget(passes, passTiers);

  const rings: MomentumRingModel[] = [
    {
      id: "streak",
      label: "Streak",
      title:
        streak.count >= 2
          ? `${streak.count} Weeks Strong`
          : "Weekly Activity Streak",
      subtitle: "Consecutive active Eastern weeks in any sport",
      current: streak.count,
      target: streakStep.target,
      fraction: streakStep.fraction,
      percent: streakStep.percent,
      valueLabel: `${streak.count}/${streakStep.target}w`,
      metricLabel: `${streak.count} / ${streakStep.target} wks`,
      tierLabel:
        streakStep.completedTiers > 0
          ? `Tier ${streakStep.completedTiers} · ${streak.active ? "Active" : "Prior"}`
          : "Tier I · In Pursuit",
      nextTierLabel:
        streak.count >= streakStep.target
          ? `${streakStep.target}-week streak reached`
          : `${streakStep.target - streak.count} ${streakStep.target - streak.count === 1 ? "week" : "weeks"} to ${streakStep.target}-week streak`,
      receipt:
        streak.count > 0
          ? `${streak.count} consecutive Eastern ${streak.count === 1 ? "week" : "weeks"} with counted training${streak.active ? " (active this week)" : ""}.`
          : "Record a counted session this week to ignite your weekly streak ring.",
      earned: streak.count >= 1,
      accent: "gold",
    },
    {
      id: "sessions",
      label: "Sessions",
      title: `Club Regular · ${sessionStep.target}`,
      subtitle: "Counted workouts in your activity history",
      current: lifetime.sessions,
      target: sessionStep.target,
      fraction: sessionStep.fraction,
      percent: sessionStep.percent,
      valueLabel: `${lifetime.sessions}/${sessionStep.target}`,
      metricLabel: `${lifetime.sessions} / ${sessionStep.target}`,
      tierLabel:
        sessionStep.completedTiers > 0
          ? `Tier ${sessionStep.completedTiers} · Earned`
          : "Tier I · First Session",
      nextTierLabel:
        lifetime.sessions >= sessionStep.target
          ? `${sessionStep.target} sessions milestone reached`
          : `${sessionStep.target - lifetime.sessions} ${sessionStep.target - lifetime.sessions === 1 ? "session" : "sessions"} to ${sessionStep.target} milestone`,
      receipt:
        lifetime.sessions > 0
          ? `${lifetime.sessions} counted ${lifetime.sessions === 1 ? "session" : "sessions"} across ${lifetime.weeks} settled ${lifetime.weeks === 1 ? "week" : "weeks"}.`
          : "Complete your first counted workout to start filling your Sessions ring.",
      earned: lifetime.sessions >= 1,
      accent: "teal",
    },
    {
      id: "rating",
      label: "Rating",
      title: `${band.name} Class`,
      subtitle: `${primarySportName} · Open Effort Score ladder`,
      current: openScore,
      target: ratingTarget,
      fraction: ratingFraction,
      percent: ratingPercent,
      valueLabel: openScore.toLocaleString(),
      metricLabel: `${openScore.toLocaleString()} / ${ratingTarget.toLocaleString()} pts`,
      tierLabel: `Band · ${band.name} (${band.min}+)`,
      nextTierLabel: nextBand
        ? `${intoNext} pts to ${nextBand.name} (${nextBand.min.toLocaleString()})`
        : "Top band reached (Champion 2,000+)",
      receipt: `${primarySportName} Open Effort Score is ${openScore.toLocaleString()}. ${band.blurb}.`,
      earned: openScore >= 750,
      accent: "ink",
    },
    {
      id: "passes",
      label: "Passes",
      title: `Rival Hunter · ${passStep.target}`,
      subtitle: "Competitors passed on live weekly courses",
      current: passes,
      target: passStep.target,
      fraction: passStep.fraction,
      percent: passStep.percent,
      valueLabel: `${passes}/${passStep.target}`,
      metricLabel: `${passes} / ${passStep.target}`,
      tierLabel:
        passStep.completedTiers > 0
          ? `Tier ${passStep.completedTiers} · Pacer`
          : "Tier I · First Pass",
      nextTierLabel:
        passes >= passStep.target
          ? `${passStep.target} overtakes milestone reached`
          : `${passStep.target - passes} ${passStep.target - passes === 1 ? "pass" : "passes"} to ${passStep.target} milestone`,
      receipt:
        passes > 0
          ? `${passes} career ${passes === 1 ? "overtake" : "overtakes"} recorded across weekly competition fields.`
          : "Pass a competitor in your weekly event lane to earn your first overtake.",
      earned: passes >= 1,
      accent: "amber",
    },
  ];

  const records = personalRecordHistory(state, now);
  const latestRecord = records.at(-1);
  let pbCard: MilestoneBentoCard;
  if (latestRecord) {
    const sameDist = records.filter(
      (r) =>
        r.sport === latestRecord.sport &&
        r.distanceId === latestRecord.distanceId,
    );
    const prior = sameDist.length >= 2 ? sameDist.at(-2) : undefined;
    const distLabel =
      RECORD_DISTANCES[latestRecord.sport]?.find(
        (d) => d.id === latestRecord.distanceId,
      )?.label ?? latestRecord.distanceId.toUpperCase();
    const dateStr = new Date(latestRecord.startedAt).toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric", timeZone: APP_TIMEZONE },
    );
    const diffSec = prior
      ? Math.max(1, Math.round(prior.seconds - latestRecord.seconds))
      : 0;
    pbCard = {
      id: "bento-pb",
      badge: `FASTEST ${distLabel.toUpperCase()}`,
      value: formatClockTime(latestRecord.seconds),
      delta: prior
        ? `↓ ${diffSec}s faster · ${dateStr}`
        : `Personal best · ${dateStr}`,
      caption: `${latestRecord.verified ? "GPS Verified" : "Open"} · ${sportById(latestRecord.sport).name}`,
      title: `Fastest ${distLabel} Crown`,
      subtitle: `${formatClockTime(latestRecord.seconds)} · ${sportById(latestRecord.sport).name} personal record`,
      tierLabel: latestRecord.verified ? "PR · GPS Verified" : "PR · Open",
      nextTierLabel: prior
        ? `Improved from ${formatClockTime(prior.seconds)} by ${diffSec}s`
        : `Complete another qualifying ${distLabel} to track improvement`,
      receipt: `Recorded on ${dateStr} via ${latestRecord.source.replaceAll("_", " ")}${latestRecord.verified ? " (GPS verified)" : ""}.`,
      dateLabel: dateStr,
      earned: true,
      tone: "dark",
    };
  } else {
    pbCard = {
      id: "bento-pb",
      badge: "PERSONAL BEST",
      value: "5K / 10K",
      delta: "Qualifying benchmark",
      caption: "Running & Cycling distances",
      title: "First Personal Best",
      subtitle: "Record a qualifying 5K, 10K, Half, Marathon or 50K+ ride",
      tierLabel: "Benchmark · Up Next",
      nextTierLabel: "Sessions within 2% of a benchmark distance set a PB",
      receipt:
        "Whole-session moving time on a qualifying distance establishes your personal record baseline.",
      dateLabel: "In Pursuit",
      earned: false,
      tone: "dark",
    };
  }

  const settled = state.periodResults.filter(
    (r) =>
      Number.isFinite(Date.parse(r.periodEnd)) &&
      Date.parse(r.periodEnd) <= now.getTime(),
  );
  const bestRound = [...settled].sort(
    (a, b) =>
      a.place - b.place || Date.parse(b.periodEnd) - Date.parse(a.periodEnd),
  )[0];
  let finishCard: MilestoneBentoCard;
  if (bestRound) {
    const rangeStr = formatWeekRangeLabel(
      bestRound.periodStart,
      bestRound.periodEnd,
    );
    const deltaStr = formatEloDelta(bestRound.eloBefore, bestRound.eloAfter);
    finishCard = {
      id: "bento-finish",
      badge:
        bestRound.place === 1
          ? "FIELD WINNER"
          : bestRound.place <= 3
            ? "PODIUM FINISH"
            : "SETTLED ROUND",
      value: `#${bestRound.place} of ${bestRound.fieldSize}`,
      delta: `${deltaStr} Effort Score`,
      caption: `${rangeStr} · ${sportById(bestRound.sport).name}`,
      title:
        bestRound.place === 1
          ? "Took the Field"
          : bestRound.place <= 3
            ? `Podium Finish (#${bestRound.place})`
            : `Week Finisher (#${bestRound.place})`,
      subtitle: `${sportById(bestRound.sport).name} (${bestRound.track === "verified" ? "GPS" : "Open"}) · ${rangeStr}`,
      tierLabel: `Place #${bestRound.place} of ${bestRound.fieldSize}`,
      nextTierLabel:
        bestRound.place === 1
          ? "Defend #1 in your next weekly wave"
          : `${bestRound.place - 1} ${bestRound.place - 1 === 1 ? "place" : "places"} from #1`,
      receipt: `${rangeStr} ${sportById(bestRound.sport).name} wave · ${formatVolume(bestRound.sport, bestRound.distanceM, bestRound.movingSec, state.units)} · ${deltaStr} Effort Score (${bestRound.eloBefore} → ${bestRound.eloAfter}).`,
      dateLabel: rangeStr,
      earned: true,
      tone: "gold",
    };
  } else {
    finishCard = {
      id: "bento-finish",
      badge: "FIELD FINISH",
      value: "Wave 01",
      delta: "Settles Monday 00:00 ET",
      caption: `${primarySportName} · Weekly field`,
      title: "First Weekly Finish",
      subtitle: "Complete your first Monday–Sunday competition round",
      tierLabel: "Weekly Round · Active",
      nextTierLabel: "Top 3 finishes earn podium honours",
      receipt:
        "When your weekly competition closes Sunday night Eastern Time, your placement and score adjustment unlock here.",
      dateLabel: "This Week",
      earned: false,
      tone: "gold",
    };
  }

  return {
    rings,
    bentoCards: [pbCard, finishCard],
    activeRingCount: rings.filter((r) => r.current > 0).length,
  };
}
