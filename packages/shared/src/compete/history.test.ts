import { describe, expect, it } from "vitest";
import {
  appendPeriodResults,
  formatEloDelta,
  pendingPeriodResults,
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
    const pending = pendingPeriodResults(rows, [
      "w1:running:open",
      "w1:running:verified",
      "w1:cycling:open",
    ]);
    expect(pending).toHaveLength(3);
    const primary = primaryRevealResults(
      rows,
      ["w1:running:open", "w1:running:verified", "w1:cycling:open"],
      "running",
    );
    expect(primary).toHaveLength(1);
    expect(primary[0]?.id).toBe("w1:running:open");
  });

  it("formats elo deltas", () => {
    expect(formatEloDelta(1000, 1015)).toBe("+15");
    expect(formatEloDelta(1000, 988)).toBe("-12");
    expect(formatEloDelta(1000, 1000)).toBe("0");
  });
});
