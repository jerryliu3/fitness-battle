import { countsOnTrack } from "./compete/ledger";
import { weeklyPeriodBounds, APP_TIMEZONE } from "./period";
import { competitionTrack, sportById } from "./compete/sports";
import { formatClockTime } from "./compete/pace";
import { formatVolume, formatEffort, type BoardRow } from "./compete/engine";
import { ordinalPlace } from "./arena-view";
import { competeNow } from "./compete/engine";
import { trainingBuckets } from "./training-view";
import type { CompeteState, SportId, UnitSystem } from "./compete/sports";

/** Calendar-week presentation only; does not change competition enrollment bounds. */
export function clubWeekSummary(state: CompeteState, now = competeNow(state)) {
  const bounds = weeklyPeriodBounds(now);
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
  return {
    movingSec: total(days),
    sessions: days.reduce((n, row) => n + row.sessions, 0),
    activeDays: days.filter((row) => row.sessions > 0).length,
    previousSec: total(previous),
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
  const rival = ahead ?? (you
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
    caption: syntheticIds.includes(rival.id) ? `${label} · simulated athlete` : `${label} in your field`,
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
