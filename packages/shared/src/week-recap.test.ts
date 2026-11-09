import { describe, expect, it } from "vitest";
import { freshState } from "./compete/engine";
import type { Activity, PeriodResult } from "./compete/sports";
import { weekRecapPages, weekRecapTraining } from "./week-recap";

const result: PeriodResult = {
  id: "running-open", sport: "running", track: "open",
  periodStart: "2026-10-26T04:00:00Z", periodEnd: "2026-11-02T05:00:00Z",
  place: 2, fieldSize: 8, effort: 10, distanceM: 5000, movingSec: 1800,
  eloBefore: 1100, eloAfter: 1105, frozen: false, settledAt: "2026-11-02T05:00:00Z",
};
const activity = (startedAt: string, movingSec = 600): Activity => ({
  id: startedAt, sport: "running", startedAt, movingSec, distanceM: 1000,
  avgHr: null, verified: false, source: "manual", disposition: "counted",
});
const stateWith = (activities: Activity[]) => ({ ...freshState(new Date("2026-11-02T12:00:00Z")), activities });

describe("week recap pages", () => {
  it("pairs result and training pages per sport in product sport order", () => {
    const cycling = { ...result, id: "cycling", sport: "cycling" as const };
    const input = [cycling, result];
    expect(weekRecapPages(input).map(p => p.kind === "arrival" ? p.kind : `${p.result.sport}:${p.kind}`))
      .toEqual(["arrival", "running:results", "running:effort", "cycling:results", "cycling:effort"]);
    expect(input).toEqual([cycling, result]);
  });
  it("handles one sport and empty input without phantom sport pages", () => {
    expect(weekRecapPages([result]).length).toBe(3);
    expect(weekRecapPages([])).toEqual([{ kind: "arrival" }]);
  });
});

describe("week recap training", () => {
  it("keeps the repeated fall-back hour and late Sunday in one Eastern date bucket", () => {
    const series = weekRecapTraining(stateWith([
      activity("2026-11-01T01:30:00-04:00"),
      activity("2026-11-01T01:30:00-05:00", 1200),
      activity("2026-11-01T23:30:00-05:00", 1800),
    ]), result);
    expect(series.labels).toEqual(["Oct 26", "Oct 27", "Oct 28", "Oct 29", "Oct 30", "Oct 31", "Nov 1"]);
    expect(series.values).toEqual([0, 0, 0, 0, 0, 0, 60]);
  });
  it("uses half-open instants across offset encodings and excludes uncounted/other-sport rows", () => {
    const included = activity("2026-10-26T00:00:00-04:00");
    const series = weekRecapTraining(stateWith([
      included, activity("2026-10-25T23:59:59-04:00"), activity("2026-11-02T00:00:00-05:00"),
      { ...included, disposition: "excluded" }, { ...included, sport: "cycling" },
      { ...included, disposition: "pending" },
    ]), result);
    expect(series.values).toEqual([10, 10, 10, 10, 10, 10, 10]);
  });
  it("keeps seven dates across the spring-forward week", () => {
    const series = weekRecapTraining(stateWith([activity("2026-03-08T23:30:00-04:00")]), {
      ...result, periodStart: "2026-03-02T05:00:00Z", periodEnd: "2026-03-09T04:00:00Z",
    });
    expect(series.values).toEqual([0, 0, 0, 0, 0, 0, 10]);
    expect(series.labels.at(-1)).toBe("Mar 8");
  });
  it("retains non-GPS strength minutes and reports missing history honestly", () => {
    const strength = { ...result, sport: "strength" as const };
    const session = { ...activity("2026-10-27T16:00:00Z", 1800), sport: "strength" as const, distanceM: 0 };
    expect(weekRecapTraining(stateWith([session]), strength).values.at(-1)).toBe(30);
    expect(weekRecapTraining(stateWith([]), strength).available).toBe(false);
  });
  it("does not include manual sessions in GPS results", () => {
    expect(weekRecapTraining(stateWith([activity("2026-10-27T16:00:00Z")]), { ...result, track: "verified" }).available).toBe(false);
  });
});
