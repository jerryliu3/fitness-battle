import type { PeriodKind } from "./types";
import {
  APP_TIMEZONE,
  dayKey,
  getZonedWeekday,
  startOfZonedDay,
} from "./timezone";

export * from "./timezone";

export interface PeriodBounds {
  kind: PeriodKind;
  startsAt: Date;
  endsAt: Date;
}

export interface CustomPeriodInput {
  startsAt: Date;
  endsAt: Date;
}

/** @deprecated Kept for compatibility. Delegates to startOfZonedDay. */
export function startOfUtcDay(date: Date): Date {
  return startOfZonedDay(date, APP_TIMEZONE);
}

/** Monday 00:00 through next Monday 00:00 in target timezone (default America/New_York). */
export function weeklyPeriodBounds(
  anchor: Date = new Date(),
  timeZone: string = APP_TIMEZONE,
): PeriodBounds {
  const weekday = getZonedWeekday(anchor, timeZone);
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  const dayStr = dayKey(anchor, timeZone);
  const [y, m, d] = dayStr.split("-").map(Number);

  const mondayAnchor = new Date(
    Date.UTC(y!, m! - 1, d! - daysFromMonday, 12, 0, 0),
  );
  const startsAt = startOfZonedDay(mondayAnchor, timeZone);

  const nextMondayAnchor = new Date(
    Date.UTC(y!, m! - 1, d! - daysFromMonday + 7, 12, 0, 0),
  );
  const endsAt = startOfZonedDay(nextMondayAnchor, timeZone);

  return { kind: "weekly", startsAt, endsAt };
}

/** Last calendar day included in a weekly competition (Sunday before exclusive `endsAt`). */
export function weeklyCompetitionLastDay(
  endsAt: Date,
  timeZone: string = APP_TIMEZONE,
): Date {
  const day = dayKey(new Date(endsAt.getTime() - 1), timeZone);
  return new Date(`${day}T12:00:00.000Z`);
}

/** Human Mon–Sun range for the active weekly competition (inclusive end date). */
export function formatWeeklyCompetitionRange(
  anchor: Date = new Date(),
  timeZone: string = APP_TIMEZONE,
): string {
  const { startsAt, endsAt } = weeklyPeriodBounds(anchor, timeZone);
  const lastDay = weeklyCompetitionLastDay(endsAt, timeZone);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone,
  };
  return `${startsAt.toLocaleDateString("en-US", opts)} – ${lastDay.toLocaleDateString("en-US", opts)}`;
}

export function dailyPeriodBounds(
  anchor: Date = new Date(),
  timeZone: string = APP_TIMEZONE,
): PeriodBounds {
  const startsAt = startOfZonedDay(anchor, timeZone);
  const dayStr = dayKey(anchor, timeZone);
  const [y, m, d] = dayStr.split("-").map(Number);
  const nextDayAnchor = new Date(Date.UTC(y!, m! - 1, d! + 1, 12, 0, 0));
  const endsAt = startOfZonedDay(nextDayAnchor, timeZone);
  return { kind: "daily", startsAt, endsAt };
}

export function monthlyPeriodBounds(
  anchor: Date = new Date(),
  timeZone: string = APP_TIMEZONE,
): PeriodBounds {
  const dayStr = dayKey(anchor, timeZone);
  const [y, m] = dayStr.split("-").map(Number);
  const monthStartAnchor = new Date(Date.UTC(y!, m! - 1, 1, 12, 0, 0));
  const startsAt = startOfZonedDay(monthStartAnchor, timeZone);
  const nextMonthAnchor = new Date(Date.UTC(y!, m!, 1, 12, 0, 0));
  const endsAt = startOfZonedDay(nextMonthAnchor, timeZone);
  return { kind: "monthly", startsAt, endsAt };
}

export function customPeriodBounds(input: CustomPeriodInput): PeriodBounds {
  if (!(input.endsAt > input.startsAt)) {
    throw new Error("custom_period_requires_ends_after_starts");
  }
  return {
    kind: "custom",
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
  };
}

/** Resolve the current period window for a battle's period kind. */
export function currentPeriodBounds(
  kind: PeriodKind,
  anchor: Date = new Date(),
  custom?: CustomPeriodInput,
  timeZone: string = APP_TIMEZONE,
): PeriodBounds {
  switch (kind) {
    case "daily":
      return dailyPeriodBounds(anchor, timeZone);
    case "weekly":
      return weeklyPeriodBounds(anchor, timeZone);
    case "monthly":
      return monthlyPeriodBounds(anchor, timeZone);
    case "custom":
      if (!custom) {
        throw new Error("custom_period_input_required");
      }
      return customPeriodBounds(custom);
    default: {
      const _exhaustive: never = kind;
      throw new Error(`unsupported_period_kind:${_exhaustive}`);
    }
  }
}

export function isWithinPeriod(
  instant: Date,
  bounds: PeriodBounds,
): boolean {
  return instant >= bounds.startsAt && instant < bounds.endsAt;
}
