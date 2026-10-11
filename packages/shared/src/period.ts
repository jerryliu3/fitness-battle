import type { PeriodKind } from "./types";

export interface PeriodBounds {
  kind: PeriodKind;
  startsAt: Date;
  endsAt: Date;
}

export interface CustomPeriodInput {
  startsAt: Date;
  endsAt: Date;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Monday 00:00 UTC through next Monday 00:00 UTC (exclusive end). */
export function weeklyPeriodBounds(anchor: Date = new Date()): PeriodBounds {
  const day = startOfUtcDay(anchor);
  const weekday = day.getUTCDay(); // 0 Sun … 6 Sat
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  const startsAt = new Date(day);
  startsAt.setUTCDate(startsAt.getUTCDate() - daysFromMonday);
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + 7);
  return { kind: "weekly", startsAt, endsAt };
}

export function dailyPeriodBounds(anchor: Date = new Date()): PeriodBounds {
  const startsAt = startOfUtcDay(anchor);
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + 1);
  return { kind: "daily", startsAt, endsAt };
}

export function monthlyPeriodBounds(anchor: Date = new Date()): PeriodBounds {
  const startsAt = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1),
  );
  const endsAt = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1),
  );
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
): PeriodBounds {
  switch (kind) {
    case "daily":
      return dailyPeriodBounds(anchor);
    case "weekly":
      return weeklyPeriodBounds(anchor);
    case "monthly":
      return monthlyPeriodBounds(anchor);
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
