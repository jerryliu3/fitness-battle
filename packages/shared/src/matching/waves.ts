import type { WaveWindow } from "./types";

const DAY_MS = 86_400_000;

/** UTC calendar day containing `date` (00:00 exclusive of next day). */
export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Exclusive end of the UTC Monday week that contains `from`.
 * Monday 00:00 is already the next week, so it runs seven days forward.
 */
export function weekEndAfter(from: Date): Date {
  const day = startOfUtcDay(from);
  const weekday = day.getUTCDay(); // 0 Sun … 6 Sat
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  const startsAt = new Date(day);
  startsAt.setUTCDate(startsAt.getUTCDate() - daysFromMonday);
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + 7);
  return endsAt;
}

/**
 * The open competition week: Monday 00:00 UTC through the next Monday.
 * Joining mid-week uses that same window. Late activities in the week count.
 */
export function waveWindowAt(now: Date = new Date()): WaveWindow {
  const end = weekEndAfter(now);
  const waveStart = new Date(end);
  waveStart.setUTCDate(waveStart.getUTCDate() - 7);
  return { waveStart, weekEnd: end };
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
 * UTC days in the enrollment window. A Monday week is 7.
 */
export function waveLengthDays(window: WaveWindow): number {
  return Math.max(
    1,
    Math.round(
      (window.weekEnd.getTime() - window.waveStart.getTime()) / DAY_MS,
    ),
  );
}
