import { countsForTraining } from "./compete/journal";
import type { Activity } from "./compete/sports";
import type { DailyHealthSample } from "./fitness/types";
import { dayKey, shiftAppDay, weeklyPeriodBounds } from "./period";

/** Consecutive Eastern calendar weeks with counted activity in any sport.
 * The current week can still be completed: show the prior streak dimmed until active.
 * Freezes affect settlement only; they do not invent an active week.
 */
export function weeklyActivityStreak(
  activities: readonly Activity[],
  now = new Date(),
  dailyHealth?: readonly DailyHealthSample[],
) {
  const weeks = new Set<string>();
  const windows: ReturnType<typeof weeklyPeriodBounds>[] = [];
  for (const row of dailyHealth ?? []) {
    if ((row.steps ?? 0) <= 0 || !row.day) continue;
    const at = Date.parse(`${row.day}T12:00:00.000Z`);
    if (!Number.isFinite(at) || at > now.getTime()) continue;
    let week = windows.find((window) => at >= window.startsAt.getTime() && at < window.endsAt.getTime());
    if (!week) {
      week = weeklyPeriodBounds(new Date(at));
      windows.push(week);
    }
    weeks.add(week.startsAt.toISOString());
  }
  for (const activity of activities) {
    const at = Date.parse(activity.startedAt);
    if (!countsForTraining(activity) || !Number.isFinite(at) || at > now.getTime() || !(activity.movingSec > 0 || activity.distanceM > 0)) continue;
    // Reuse period bounds for sessions in the same week instead of repeating timezone work.
    let week = windows.find(window => at >= window.startsAt.getTime() && at < window.endsAt.getTime());
    if (!week) { week = weeklyPeriodBounds(new Date(at)); windows.push(week); }
    weeks.add(week.startsAt.toISOString());
  }
  let start = weeklyPeriodBounds(now).startsAt;
  const active = weeks.has(start.toISOString());
  if (!active) start = shiftAppDay(start, -7);
  let count = 0;
  while (weeks.has(start.toISOString())) {
    count++;
    start = shiftAppDay(start, -7);
  }
  return { count, active };
}

/** Today’s counted activity controls the flame fill, independently of the weekly count. */
export function hasCountedActivityToday(activities: readonly Activity[], now = new Date()) {
  const today = dayKey(now);
  return activities.some(activity => {
    const at = Date.parse(activity.startedAt);
    return countsForTraining(activity) && Number.isFinite(at) && at <= now.getTime()
      && (activity.movingSec > 0 || activity.distanceM > 0) && dayKey(new Date(at)) === today;
  });
}
