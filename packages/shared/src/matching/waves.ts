import type { WaveWindow } from "./types";

const DAY_MS = 86_400_000;

/** UTC calendar day containing `date` (00:00 exclusive of next day). */
export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Exclusive end of the competition week that contains `from`.
 * Weeks reset Sunday 00:00 UTC. If `from` is already Sunday midnight,
 * the window runs a full seven days to the following Sunday.
 */
export function weekEndAfter(from: Date): Date {
  const day = startOfUtcDay(from);
  const weekday = day.getUTCDay(); // 0 Sun … 6 Sat
  const daysUntilNextSunday = weekday === 0 ? 7 : 7 - weekday;
  const endsAt = new Date(day);
  endsAt.setUTCDate(endsAt.getUTCDate() + daysUntilNextSunday);
  return endsAt;
}

/**
 * Rolling daily wave: join locks waveStart to today's UTC midnight;
 * weekEnd is the upcoming Sunday reset (exclusive).
 */
export function waveWindowAt(now: Date = new Date()): WaveWindow {
  const waveStart = startOfUtcDay(now);
  return { waveStart, weekEnd: weekEndAfter(waveStart) };
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

/** Whole UTC days remaining until weekEnd (ceil), clamped ≥ 0. */
export function daysLeftInWave(window: WaveWindow, now: Date = new Date()): number {
  const ms = window.weekEnd.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / DAY_MS);
}

/** Inclusive UTC midnights from waveStart up to (but not including) through. */
export function utcDaysInRange(start: Date, throughExclusive: Date): Date[] {
  const days: Date[] = [];
  let cursor = startOfUtcDay(start);
  const end = throughExclusive.getTime();
  while (cursor.getTime() < end) {
    days.push(cursor);
    cursor = new Date(cursor.getTime() + DAY_MS);
  }
  return days;
}

/**
 * Fraction of a full Sun→Sun week that this wave covers (1 for Sunday joiners,
 * 6/7 for Monday, …, 1/7 for Saturday).
 */
export function waveLengthDays(window: WaveWindow): number {
  return Math.max(
    1,
    Math.round(
      (window.weekEnd.getTime() - window.waveStart.getTime()) / DAY_MS,
    ),
  );
}
