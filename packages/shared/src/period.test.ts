import { describe, expect, it } from "vitest";
import {
  currentPeriodBounds,
  dailyPeriodBounds,
  dayKey,
  isWithinPeriod,
  monthlyPeriodBounds,
  startOfZonedDay,
  weeklyPeriodBounds,
  formatWeeklyCompetitionRange,
} from "./period";

describe("period model (America/New_York source of truth)", () => {
  it("defaults weekly bounds to Monday–Monday America/New_York (EDT)", () => {
    // Wednesday 2026-10-07 (EDT is UTC-4)
    const bounds = weeklyPeriodBounds(new Date("2026-10-07T15:00:00.000Z"));
    expect(bounds.kind).toBe("weekly");
    expect(bounds.startsAt.toISOString()).toBe("2026-10-05T04:00:00.000Z");
    expect(bounds.endsAt.toISOString()).toBe("2026-10-12T04:00:00.000Z");
  });

  it("keeps Sunday evening in New York inside the current week", () => {
    // Sunday 2026-10-11 at 11:30 PM EDT (03:30 UTC on Oct 12)
    const sundayNight = new Date("2026-10-12T03:30:00.000Z");
    const bounds = weeklyPeriodBounds(sundayNight);
    expect(bounds.startsAt.toISOString()).toBe("2026-10-05T04:00:00.000Z");
    expect(bounds.endsAt.toISOString()).toBe("2026-10-12T04:00:00.000Z");
    expect(isWithinPeriod(sundayNight, bounds)).toBe(true);
    expect(dayKey(sundayNight)).toBe("2026-10-11");
  });

  it("handles winter standard time (EST, UTC-5)", () => {
    // Wednesday 2026-01-14
    const bounds = weeklyPeriodBounds(new Date("2026-01-14T15:00:00.000Z"));
    expect(bounds.startsAt.toISOString()).toBe("2026-01-12T05:00:00.000Z");
    expect(bounds.endsAt.toISOString()).toBe("2026-01-19T05:00:00.000Z");
  });

  it("supports daily and monthly kinds via currentPeriodBounds", () => {
    const daily = currentPeriodBounds(
      "daily",
      new Date("2026-10-11T12:00:00.000Z"),
    );
    expect(daily).toEqual(
      dailyPeriodBounds(new Date("2026-10-11T12:00:00.000Z")),
    );
    expect(daily.startsAt.toISOString()).toBe("2026-10-11T04:00:00.000Z");
    expect(daily.endsAt.toISOString()).toBe("2026-10-12T04:00:00.000Z");

    const monthly = currentPeriodBounds(
      "monthly",
      new Date("2026-10-11T12:00:00.000Z"),
    );
    expect(monthly).toEqual(
      monthlyPeriodBounds(new Date("2026-10-11T12:00:00.000Z")),
    );
    expect(monthly.startsAt.toISOString()).toBe("2026-10-01T04:00:00.000Z");
    expect(monthly.endsAt.toISOString()).toBe("2026-11-01T04:00:00.000Z");
  });

  it("handles DST transitions correctly (spring-forward 167h and fall-back 169h weeks)", () => {
    // Spring forward: Sunday March 8, 2026 at 2 AM clock jumps to 3 AM.
    // The week of Monday March 2 starts at 05:00:00Z (EST) and ends on Monday March 9 at 04:00:00Z (EDT).
    const springWeek = weeklyPeriodBounds(new Date("2026-03-04T12:00:00.000Z"));
    expect(springWeek.startsAt.toISOString()).toBe("2026-03-02T05:00:00.000Z");
    expect(springWeek.endsAt.toISOString()).toBe("2026-03-09T04:00:00.000Z");
    const springHours = (springWeek.endsAt.getTime() - springWeek.startsAt.getTime()) / 3600000;
    expect(springHours).toBe(167);

    // Fall back: Sunday November 1, 2026 at 2 AM clock falls back to 1 AM.
    // The week of Monday October 26 starts at 04:00:00Z (EDT) and ends on Monday November 2 at 05:00:00Z (EST).
    const fallWeek = weeklyPeriodBounds(new Date("2026-10-28T12:00:00.000Z"));
    expect(fallWeek.startsAt.toISOString()).toBe("2026-10-26T04:00:00.000Z");
    expect(fallWeek.endsAt.toISOString()).toBe("2026-11-02T05:00:00.000Z");
    const fallHours = (fallWeek.endsAt.getTime() - fallWeek.startsAt.getTime()) / 3600000;
    expect(fallHours).toBe(169);
  });

  it("handles monthly bounds across DST shift (November)", () => {
    // November 1 in EDT (04:00Z) through December 1 in EST (05:00Z)
    const novMonth = monthlyPeriodBounds(new Date("2026-11-15T12:00:00.000Z"));
    expect(novMonth.startsAt.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(novMonth.endsAt.toISOString()).toBe("2026-12-01T05:00:00.000Z");
  });

  it("treats end as exclusive", () => {
    const bounds = weeklyPeriodBounds(new Date("2026-10-07T00:00:00.000Z"));
    expect(isWithinPeriod(bounds.startsAt, bounds)).toBe(true);
    expect(isWithinPeriod(bounds.endsAt, bounds)).toBe(false);
  });

  it("formats an inclusive Mon–Sun label for the competition header", () => {
    const label = formatWeeklyCompetitionRange(
      new Date("2026-10-18T18:00:00.000Z"),
    );
    expect(label).toBe("Oct 12 – Oct 18");
  });
});
