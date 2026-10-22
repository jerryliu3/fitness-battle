import { weeklyPeriodBounds, APP_TIMEZONE } from "./period";
import { competeNow } from "./compete/engine";
import { trainingBuckets } from "./training-view";
import type { CompeteState } from "./compete/sports";

/** Calendar-week presentation only; does not change competition enrollment bounds. */
export function clubWeekSummary(state: CompeteState, now = competeNow(state)) {
  const bounds = weeklyPeriodBounds(now);
  const previous = trainingBuckets(state.activities, "all", "week", new Date(bounds.startsAt.getTime() - 1), now);
  const days = trainingBuckets(state.activities, "all", "week", now, now);
  const total = (rows: typeof days) => rows.reduce((n, row) => n + row.movingSec, 0);
  return {
    movingSec: total(days),
    sessions: days.reduce((n, row) => n + row.sessions, 0),
    activeDays: days.filter(row => row.sessions > 0).length,
    previousSec: total(previous),
    firstName: state.name.trim().split(/\s+/)[0] || "athlete",
    greeting: Number(new Intl.DateTimeFormat("en-US", { timeZone: APP_TIMEZONE, hour: "numeric", hourCycle: "h23" }).format(now)) < 12 ? "Good morning" : Number(new Intl.DateTimeFormat("en-US", { timeZone: APP_TIMEZONE, hour: "numeric", hourCycle: "h23" }).format(now)) < 18 ? "Good afternoon" : "Good evening",
  };
}
export function clubDuration(seconds: number): string {
  const minutes = Math.round(Math.max(0, seconds) / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

/** Immediate higher-place athlete, including tied totals. No past-self row is ranked. */
export function nextClubRival(rows: readonly import("./compete/engine").BoardRow[]) {
  const you = rows.find(row => row.you);
  const rival = you ? rows.filter(row => !row.you && row.place < you.place).sort((a,b) => b.place-a.place)[0] : undefined;
  return { you, rival, fieldSize: rows.length };
}
