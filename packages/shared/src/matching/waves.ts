import type { WaveWindow } from "./types";
import {
  APP_TIMEZONE,
  endOfZonedDay,
  startOfZonedDay,
  weeklyPeriodBounds,
} from "../period";

const DAY_MS = 86_400_000;

/** Convert a calendar day's 06:00 wall clock without assuming a 24-hour DST day. */
function sixAmOn(day: Date, timeZone: string): Date {
  // Noon has the same UTC offset as 06:00 in New York, including transition days.
  const midnight = startOfZonedDay(day, timeZone);
  const noonProbe = new Date(midnight.getTime() + 12 * 3_600_000);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(noonProbe));
  return new Date(noonProbe.getTime() + (6 - hour) * 3_600_000);
}

/** Registration joins today's 06:00 ET if it has not passed, otherwise tomorrow's. */
export function nextDailyWaveWindowAt(now: Date = new Date(), timeZone = APP_TIMEZONE): WaveWindow {
  let waveStart = sixAmOn(now, timeZone);
  if (waveStart < now) waveStart = sixAmOn(endOfZonedDay(now, timeZone), timeZone);
  return { waveStart, weekEnd: weekEndAfter(waveStart, timeZone) };
}

/** Renewal is always Monday 06:00 ET, even when the athlete returns later that week. */
export function weeklyWaveWindowAt(now: Date = new Date(), timeZone = APP_TIMEZONE): WaveWindow {
  const week = weeklyPeriodBounds(now, timeZone);
  return { waveStart: sixAmOn(week.startsAt, timeZone), weekEnd: week.endsAt };
}

/** Optional immediate grouping uses the same enrollment shape and a derived start. */
export function instantWaveWindowAt(now: Date = new Date(), timeZone = APP_TIMEZONE): WaveWindow {
  return { waveStart: new Date(now), weekEnd: weekEndAfter(now, timeZone) };
}

/**
 * Exclusive end of the America/New_York Monday week that contains `from`.
 * Monday 00:00 is already the next week, so it runs seven days forward.
 */
export function weekEndAfter(
  from: Date,
  timeZone: string = APP_TIMEZONE,
): Date {
  return weeklyPeriodBounds(from, timeZone).endsAt;
}

/**
 * Calendar training week, retained for charts, legacy windows and fixtures.
 * New registrations use nextDailyWaveWindowAt instead.
 */
export function waveWindowAt(
  now: Date = new Date(),
  timeZone: string = APP_TIMEZONE,
): WaveWindow {
  const { startsAt, endsAt } = weeklyPeriodBounds(now, timeZone);
  return { waveStart: startsAt, weekEnd: endsAt };
}

export function isWithinWave(
  instant: Date,
  window: WaveWindow,
): boolean {
  return instant >= window.waveStart && instant < window.weekEnd;
}

export function waveIsOpen(window: WaveWindow, now: Date = new Date()): boolean {
  return now < window.weekEnd;
}

/** Whole calendar days remaining until weekEnd (ceil), clamped ≥ 0. */
export function daysLeftInWave(window: WaveWindow, now: Date = new Date()): number {
  const ms = window.weekEnd.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / DAY_MS);
}

/** Inclusive zoned midnights from waveStart up to (but not including) through. */
export function zonedDaysInRange(
  start: Date,
  throughExclusive: Date,
  timeZone: string = APP_TIMEZONE,
): Date[] {
  const days: Date[] = [];
  let cursor = startOfZonedDay(start, timeZone);
  const end = throughExclusive.getTime();
  while (cursor.getTime() < end) {
    days.push(cursor);
    cursor = endOfZonedDay(cursor, timeZone);
  }
  return days;
}

/** @deprecated Alias for zonedDaysInRange */
export const utcDaysInRange = zonedDaysInRange;

/**
 * Days in the enrollment window. A Monday week is 7.
 */
export function waveLengthDays(window: WaveWindow): number {
  return Math.max(
    1,
    Math.round(
      (window.weekEnd.getTime() - window.waveStart.getTime()) / DAY_MS,
    ),
  );
}
