import type { WaveWindow } from "./types";
import {
  APP_TIMEZONE,
  dayKey,
  endOfZonedDay,
  startOfZonedDay,
  weeklyPeriodBounds,
} from "../period";

const DAY_MS = 86_400_000;

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
 * The open competition week: Monday 00:00 through the next Monday in America/New_York.
 * Joining mid-week uses that same window. Late activities in the week count.
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
