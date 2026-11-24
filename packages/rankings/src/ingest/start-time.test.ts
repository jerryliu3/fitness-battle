import { describe, expect, it } from "vitest";
import {
  deriveNyrrStartAtIso,
  gunOffsetBackfillSql,
  localWallClockToIso,
  parseWallClockSeconds,
  performanceStartTimesUpdateSql,
} from "./start-time";

describe("start-time utilities", () => {
  it("parses 24h and 12h wall-clock strings", () => {
    expect(parseWallClockSeconds("07:30:01")).toBe(7 * 3600 + 30 * 60 + 1);
    expect(parseWallClockSeconds("07:43:59AM")).toBe(7 * 3600 + 43 * 60 + 59);
    expect(parseWallClockSeconds("12:05:00 PM")).toBe(12 * 3600 + 5 * 60);
    expect(parseWallClockSeconds("12:00:00 AM")).toBe(0);
    expect(parseWallClockSeconds("1:15:30 PM")).toBe(13 * 3600 + 15 * 60 + 30);
    expect(parseWallClockSeconds("--")).toBeNull();
  });

  it("converts local edition wall-clock time to UTC ISO across DST zones", () => {
    // Chicago CDT (UTC-5) on Oct 12, 2025
    expect(localWallClockToIso("2025-10-12", "07:30:01", "America/Chicago")).toBe(
      "2025-10-12T12:30:01.000Z",
    );
    // NYC EST (UTC-5) on Nov 1, 2026 (DST ends at 2:00 AM that morning)
    expect(localWallClockToIso("2026-11-01", "09:10:00", "America/New_York")).toBe(
      "2026-11-01T14:10:00.000Z",
    );
    // Berlin CEST (UTC+2) on Sep 21, 2025
    expect(localWallClockToIso("2025-09-21", "09:15:00", "Europe/Berlin")).toBe(
      "2025-09-21T07:15:00.000Z",
    );
  });

  it("derives NYRR NYC Marathon wave and elite start timestamps from gun vs chip delta", () => {
    // Wave 5 runner: 2h20m15s after Wave 1 (9:10 AM EST) => 11:30:15 AM EST (16:30:15Z)
    expect(
      deriveNyrrStartAtIso({
        startsOn: "2026-11-01",
        chipTimeMs: 4 * 3600_000 + 52 * 60_000 + 41_000,
        gunTimeMs: 7 * 3600_000 + 12 * 60_000 + 56_000,
        bib: "55000",
        sex: "female",
      }),
    ).toBe("2026-11-01T16:30:15.000Z");

    // Pro Women bib 102 with gun == chip => 8:35 AM EST (13:35:00Z)
    expect(
      deriveNyrrStartAtIso({
        startsOn: "2026-11-01",
        chipTimeMs: 2 * 3600_000 + 24 * 60_000 + 36_000,
        gunTimeMs: 2 * 3600_000 + 24 * 60_000 + 36_000,
        bib: "102",
        sex: "female",
      }),
    ).toBe("2026-11-01T13:35:00.000Z");

    // Pro Men bib 4 with gun == chip => 9:05 AM EST (14:05:00Z)
    expect(
      deriveNyrrStartAtIso({
        startsOn: "2026-11-01",
        chipTimeMs: 2 * 3600_000 + 6 * 60_000 + 1_000,
        gunTimeMs: 2 * 3600_000 + 6 * 60_000 + 1_000,
        bib: "4",
        sex: "male",
      }),
    ).toBe("2026-11-01T14:05:00.000Z");

    // Wheelchair => 8:00 AM EST (13:00:00Z)
    expect(
      deriveNyrrStartAtIso({
        startsOn: "2026-11-01",
        chipTimeMs: 1 * 3600_000 + 35 * 60_000 + 38_000,
        gunTimeMs: 1 * 3600_000 + 35 * 60_000 + 38_000,
        bib: "202",
        sex: "male",
        competitionClass: "wheelchair",
      }),
    ).toBe("2026-11-01T13:00:00.000Z");

    // Rejects missing or negative offset
    expect(
      deriveNyrrStartAtIso({
        startsOn: "2026-11-01",
        chipTimeMs: 10_000_000,
        gunTimeMs: 9_000_000,
      }),
    ).toBeNull();
  });

  it("emits SQL for gun-offset and batch start-time backfills", () => {
    const gunSql = gunOffsetBackfillSql({
      sourceSlug: "sf_marathon",
      externalEventId: "91608-242840",
      editionYear: 2026,
      distance: "marathon",
      gunStartIso: "2026-07-26T05:15:00-07:00",
    });
    expect(gunSql).toContain("set start_at = '2026-07-26T05:15:00-07:00'::timestamptz");
    expect(gunSql).toContain("(p.gun_time_ms - p.chip_time_ms)");

    const batchSql = performanceStartTimesUpdateSql(
      { sourceSlug: "nyrr_nyc_marathon", externalEventId: "M2026", editionYear: 2026, distance: "marathon" },
      [{ externalResultId: "M2026:1", gunTimeMs: 7561000, startAt: "2026-11-01T14:05:00.000Z" }],
    );
    expect(batchSql).toContain("gun_time_ms = coalesce(v.gun_time_ms, p.gun_time_ms)");
    expect(batchSql).toContain("'2026-11-01T14:05:00.000Z'::timestamptz");
  });
});
