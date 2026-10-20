export const APP_TIMEZONE = "America/New_York";

/**
 * Returns YYYY-MM-DD for an instant in the specified time zone (default: America/New_York).
 */
export function dayKey(date: Date, timeZone: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

/**
 * Returns the 0-6 weekday in the target timezone (0 = Sun, 1 = Mon, ..., 6 = Sat).
 */
export function getZonedWeekday(
  date: Date,
  timeZone: string = APP_TIMEZONE,
): number {
  const dayStr = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[dayStr] ?? 0;
}

/**
 * Computes the exact UTC Date corresponding to 00:00:00.000 in `timeZone`
 * on the calendar day that contains `date`.
 */
export function startOfZonedDay(
  date: Date = new Date(),
  timeZone: string = APP_TIMEZONE,
): Date {
  const dayStr = new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
  const [y, m, d] = dayStr.split("-").map(Number);
  const tentativeUtc = new Date(Date.UTC(y!, m! - 1, d!, 0, 0, 0));

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(tentativeUtc);

  const p: Record<string, string> = {};
  for (const part of parts) {
    p[part.type] = part.value;
  }
  const wallClockAsUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  const offsetMs = tentativeUtc.getTime() - wallClockAsUtc;

  return new Date(tentativeUtc.getTime() + offsetMs);
}

/**
 * Computes the exact UTC Date corresponding to 00:00:00.000 in `timeZone`
 * on the next calendar day after `date`.
 */
export function endOfZonedDay(
  date: Date = new Date(),
  timeZone: string = APP_TIMEZONE,
): Date {
  const dayStr = dayKey(date, timeZone);
  const [y, m, d] = dayStr.split("-").map(Number);
  const nextDayAnchor = new Date(Date.UTC(y!, m! - 1, d! + 1, 12, 0, 0));
  return startOfZonedDay(nextDayAnchor, timeZone);
}

/** Midnight Eastern, offset by calendar days rather than fixed 24-hour durations. */
export function shiftAppDay(date: Date, offset: number): Date {
  const [year, month, day] = dayKey(date).split("-").map(Number);
  return startOfZonedDay(new Date(Date.UTC(year!, month! - 1, day! + offset, 12)));
}
