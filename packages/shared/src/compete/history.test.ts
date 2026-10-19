import { describe, expect, it } from "vitest";
import {
  acknowledgePeriodResults,
  appendPeriodResults,
  formatEloDelta,
  formatEffortScoreDelta,
  pendingPeriodResults,
  pendingRevealIdsFromResults,
  primaryRevealResults,
} from "./history";
import type { PeriodResult } from "./sports";

function result(
  patch: Partial<PeriodResult> & Pick<PeriodResult, "id" | "sport" | "track">,
): PeriodResult {
  return {
    periodStart: "2026-10-05T00:00:00.000Z",
    periodEnd: "2026-10-12T00:00:00.000Z",
    place: 4,
    fieldSize: 8,
    effort: 12,
    distanceM: 12000,
    movingSec: 3600,
    eloBefore: 1000,
    eloAfter: 1012,
    frozen: false,
    settledAt: "2026-10-12T00:00:01.000Z",
    acknowledgedAt: null,
    ...patch,
  };
}

describe("period history helpers", () => {
  it("dedupes and caps appended results", () => {
    const first = result({ id: "a", sport: "running", track: "open" });
    const updated = result({
      id: "a",
      sport: "running",
      track: "open",
      eloAfter: 1020,
    });
    const next = appendPeriodResults([first], [updated]);
    expect(next).toHaveLength(1);
    expect(next[0]?.eloAfter).toBe(1020);
  });

  it("filters pending reveals and prefers primary open track", () => {
    const rows = [
      result({
        id: "w1:running:open",
        sport: "running",
        track: "open",
        periodStart: "2026-10-05T00:00:00.000Z",
      }),
      result({
        id: "w1:running:verified",
        sport: "running",
        track: "verified",
        periodStart: "2026-10-05T00:00:00.000Z",
      }),
      result({
        id: "w1:cycling:open",
        sport: "cycling",
        track: "open",
        periodStart: "2026-10-05T00:00:00.000Z",
      }),
    ];
    expect(pendingPeriodResults(rows)).toHaveLength(3);
    const primary = primaryRevealResults(rows, undefined, "running");
    expect(primary).toHaveLength(1);
    expect(primary[0]?.id).toBe("w1:running:open");
  });

  it("derives pending ids from acknowledged_at and clears on acknowledge", () => {
    const rows = [
      result({ id: "a", sport: "running", track: "open" }),
      result({
        id: "b",
        sport: "running",
        track: "verified",
        acknowledgedAt: "2026-10-12T01:00:00.000Z",
      }),
    ];
    expect(pendingRevealIdsFromResults(rows)).toEqual(["a"]);
    const cleared = acknowledgePeriodResults(
      rows,
      null,
      "2026-10-12T02:00:00.000Z",
    );
    expect(pendingRevealIdsFromResults(cleared)).toEqual([]);
    expect(cleared[0]?.acknowledgedAt).toBe("2026-10-12T02:00:00.000Z");
  });

  it("formats elo deltas", () => {
    expect(formatEloDelta(1000, 1015)).toBe("+15");
    expect(formatEloDelta(1000, 988)).toBe("-12");
    expect(formatEloDelta(1000, 1000)).toBe("0");
    expect(formatEffortScoreDelta(1000, 1015)).toBe("+15");
  });
});
