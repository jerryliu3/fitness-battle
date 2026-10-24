import { countsOnTrack } from "./compete/ledger";
import type { Activity } from "./compete/sports";
import { shiftAppDay, weeklyPeriodBounds } from "./period";

/** Consecutive Eastern calendar weeks with counted activity in any sport.
 * The current week can still be completed: show the prior streak dimmed until active.
 * Freezes affect settlement only; they do not invent an active week.
 */
export function weeklyActivityStreak(activities: readonly Activity[], now = new Date()) {
  const weeks = new Set<string>();
  const windows: ReturnType<typeof weeklyPeriodBounds>[] = [];
  for (const activity of activities) {
    const at = Date.parse(activity.startedAt);
    if (!countsOnTrack(activity, "open") || !Number.isFinite(at) || at > now.getTime() || !(activity.movingSec > 0 || activity.distanceM > 0)) continue;
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
