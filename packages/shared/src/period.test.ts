import { describe, expect, it } from "vitest";
import {
  currentPeriodBounds,
  dailyPeriodBounds,
  isWithinPeriod,
  weeklyPeriodBounds,
} from "./period";

describe("period model", () => {
  it("defaults weekly bounds to Monday–Monday UTC", () => {
    // Wednesday 2026-10-07
    const bounds = weeklyPeriodBounds(new Date("2026-10-07T15:00:00.000Z"));
    expect(bounds.kind).toBe("weekly");
    expect(bounds.startsAt.toISOString()).toBe("2026-10-05T00:00:00.000Z");
    expect(bounds.endsAt.toISOString()).toBe("2026-10-12T00:00:00.000Z");
  });

  it("supports daily and monthly kinds via currentPeriodBounds", () => {
    const daily = currentPeriodBounds(
      "daily",
      new Date("2026-10-11T12:00:00.000Z"),
    );
    expect(daily).toEqual(
      dailyPeriodBounds(new Date("2026-10-11T12:00:00.000Z")),
    );

    const monthly = currentPeriodBounds(
      "monthly",
      new Date("2026-10-11T12:00:00.000Z"),
    );
    expect(monthly.startsAt.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(monthly.endsAt.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("treats end as exclusive", () => {
    const bounds = weeklyPeriodBounds(new Date("2026-10-07T00:00:00.000Z"));
    expect(isWithinPeriod(bounds.startsAt, bounds)).toBe(true);
    expect(isWithinPeriod(bounds.endsAt, bounds)).toBe(false);
  });
});
