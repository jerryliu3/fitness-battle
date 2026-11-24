import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mikaSplitsForProfile, parseMikaTimingDetailSplits, parseMikaTimingStartSeconds } from "./mikatiming-splits";

const root = dirname(fileURLToPath(import.meta.url));

describe("parseMikaTimingDetailSplits", () => {
  it("parses cumulative chip times from a Chicago detail fixture", () => {
    const html = readFileSync(join(root, "../../fixtures/chicago-detail-sample.html"), "utf8");
    const rows = parseMikaTimingDetailSplits(html);
    expect(rows.some((row) => row.label === "05K" && row.elapsedMs === 838_000)).toBe(true);
    expect(rows.some((row) => row.label === "Finish" && row.elapsedMs === 7_343_000)).toBe(true);
  });

  it("aligns rows to the km-10 marathon profile and extracts start time-of-day", () => {
    const html = readFileSync(join(root, "../../fixtures/chicago-detail-sample.html"), "utf8");
    expect(parseMikaTimingStartSeconds(html)).toBe(7 * 3600 + 30 * 60 + 1);
    const aligned = mikaSplitsForProfile(html, "marathon_km10", {
      startsOn: "2025-10-12",
      timeZone: "America/Chicago",
    });
    expect(aligned.startAt).toBe("2025-10-12T12:30:01.000Z");
    expect(aligned.elapsedMs).toEqual([
      838_000,
      1_705_000,
      2_561_000,
      3_426_000,
      3_616_000,
      4_272_000,
      5_131_000,
      5_993_000,
      6_910_000,
      7_343_000,
    ]);
  });
});