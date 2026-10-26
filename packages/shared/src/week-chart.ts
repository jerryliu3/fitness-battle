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
  const currHoursSameDay = currCumulativeHours[nowDayIndex] ?? 0;
  const prevHoursSameDay = prevCumulativeHours[nowDayIndex] ?? 0;
  return {
    nowDayIndex, currCumulativeHours, prevCumulativeHours,
    currTotalHours: Number((currentSeconds / 3600).toFixed(1)),
    prevTotalHours: Number((prevCumulativeHours.at(-1) ?? 0).toFixed(1)),
    currHoursSameDay,
    prevHoursSameDay,
    sessionCount: current.length,
    weekProgress: Math.min(1, Math.max(0, (now.getTime() - weekStart) / (weekEnd - weekStart || 1))),
  };
}

function roundedHour(hours: number) {
  return Number(hours.toFixed(1));
}

/** Whether this week is at or above last week through the same weekday (for delta coloring). */
export function weekHoursDeltaTone(chart: { currHoursSameDay: number; prevHoursSameDay: number }): "up" | "down" {
  return roundedHour(chart.currHoursSameDay) >= roundedHour(chart.prevHoursSameDay) ? "up" : "down";
}

/** Shared Portfolio geometry. The existing hour eligibility/period model stays authoritative. */
export function portfolioWeekChart(state: CompeteState, now = competeNow(state)) {
  const comparison = weeklyHoursComparison(state, now);
  const { currCumulativeHours, prevCumulativeHours, nowDayIndex, weekProgress, currTotalHours } = comparison;
  const width = 340, height = 164, left = 12, right = 328, top = 14, bottom = 150;
  const max = Math.max(1, ...currCumulativeHours, ...prevCumulativeHours) * 1.15;
  const y = (hours: number) => bottom - hours / max * (bottom - top);
  const x = (index: number) => left + (index + 1) / 7 * (right - left);
  const tip = { x: left + weekProgress * (right - left), y: y(currTotalHours) };
  const origin = `${left},${bottom}`;
  const previous = [origin, ...prevCumulativeHours.map((hours, index) => `${x(index).toFixed(1)},${y(hours).toFixed(1)}`)].join(" ");
  const current = [origin, ...currCumulativeHours.slice(0, nowDayIndex).map((hours, index) => `${x(index).toFixed(1)},${y(hours).toFixed(1)}`), `${tip.x.toFixed(1)},${tip.y.toFixed(1)}`].join(" ");
  const period = competePeriodWindow(state, now);
  const date = (at: Date) => at.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE });
  const inspection = currCumulativeHours.map((hours, index) => ({
    id: dayKey(shiftAppDay(period.startsAt, index)), x: index === nowDayIndex ? tip.x : x(index), y: y(hours),
    label: date(shiftAppDay(period.startsAt, index)), value: `${hours.toFixed(1)} hr · last week ${prevCumulativeHours[index].toFixed(1)} hr`,
  }));
  const deltaHours = Number((roundedHour(comparison.currHoursSameDay) - roundedHour(comparison.prevHoursSameDay)).toFixed(1));
  const deltaTone = weekHoursDeltaTone(comparison);
  return { ...comparison, width, height, left, right, top, bottom, tip, current, previous, inspection,
    area: `${current} ${tip.x.toFixed(1)},${bottom} ${origin}`,
    startLabel: date(period.startsAt), endLabel: date(new Date(period.endsAt.getTime() - 1)),
    deltaLabel: `${deltaHours >= 0 ? "+" : ""}${deltaHours.toFixed(1)}h vs last week`,
    deltaTone,
  };
}
