import { competeNow } from "./compete/engine";
import { competePeriodWindow } from "./phone-views";
import { countsOnTrack } from "./compete/ledger";
import type { CompeteState } from "./compete/sports";
import { APP_TIMEZONE, dayKey, getZonedWeekday, shiftAppDay, weeklyPeriodBounds } from "./period";

/** Shared hour totals for Home and its detail view, independent of either SVG adapter. */
export function weeklyHoursComparison(state: CompeteState, now = competeNow(state)) {
  const period = competePeriodWindow(state, now);
  const weekStart = period.startsAt.getTime(), weekEnd = period.endsAt.getTime();
  const previousStart = weeklyPeriodBounds(new Date(weekStart - 1)).startsAt;
  const rows = state.activities.filter(a => countsOnTrack(a, "open") && Date.parse(a.startedAt) <= now.getTime());
  const current = rows.filter(a => Date.parse(a.startedAt) >= weekStart && Date.parse(a.startedAt) < weekEnd);
  const previous = rows.filter(a => Date.parse(a.startedAt) >= previousStart.getTime() && Date.parse(a.startedAt) < weekStart);
  const weekday = getZonedWeekday(now, APP_TIMEZONE);
  const nowDayIndex = Math.min(6, Math.max(0, weekday === 0 ? 6 : weekday - 1));
  function cumulative(activities: typeof rows, start: Date, days: number) {
    const secondsByDay = new Map<string, number>();
    for (const activity of activities) {
      const key = dayKey(new Date(activity.startedAt), APP_TIMEZONE);
      secondsByDay.set(key, (secondsByDay.get(key) ?? 0) + (activity.movingSec || 0));
    }
    let total = 0;
    return Array.from({ length: days }, (_, index) => {
      total += secondsByDay.get(dayKey(shiftAppDay(start, index), APP_TIMEZONE)) ?? 0;
      return Number((total / 3600).toFixed(2));
    });
  }
  const currCumulativeHours = cumulative(current, period.startsAt, nowDayIndex + 1);
  const prevCumulativeHours = cumulative(previous, previousStart, 7);
  const currentSeconds = current.reduce((sum, a) => sum + (a.movingSec || 0), 0);
  currCumulativeHours[currCumulativeHours.length - 1] = Number((currentSeconds / 3600).toFixed(2));
  return {
    nowDayIndex, currCumulativeHours, prevCumulativeHours,
    currTotalHours: Number((currentSeconds / 3600).toFixed(1)),
    prevTotalHours: Number((prevCumulativeHours.at(-1) ?? 0).toFixed(1)),
    sessionCount: current.length,
    weekProgress: Math.min(1, Math.max(0, (now.getTime() - weekStart) / (weekEnd - weekStart || 1))),
  };
}
