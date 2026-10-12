import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isUnder18AgeGroup, parseOpenTrackCompetition } from "./opentrack";
import { formatRaceTime, parseRaceTimeMs } from "./time";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/emv-10k-2025.json",
);

describe("race times", () => {
  it("parses minute and hour clocks", () => {
    expect(parseRaceTimeMs("30:28")).toBe(1_828_000);
    expect(parseRaceTimeMs("1:02:03")).toBe(3_723_000);
    expect(parseRaceTimeMs("34:27.5")).toBe(2_067_500);
    expect(parseRaceTimeMs("DNF")).toBeNull();
  });

  it("formats a stored time back to a clock", () => {
    expect(formatRaceTime(1_828_000)).toBe("30:28");
  });
});

describe("under-18 age groups", () => {
  it("drops bands that are entirely under 18 and keeps U20", () => {
    expect(isUnder18AgeGroup("U18")).toBe(true);
    expect(isUnder18AgeGroup("U16")).toBe(true);
    expect(isUnder18AgeGroup("U20")).toBe(false);
    expect(isUnder18AgeGroup("SEN")).toBe(false);
  });
});

describe("OpenTrack import", () => {
  it("keeps adult 10k finishers from the Estonian championship fixture", () => {
    const competition = JSON.parse(readFileSync(fixturePath, "utf8"));
    const parsed = parseOpenTrackCompetition(competition);
    expect(parsed.editionYear).toBe(2025);
    expect(parsed.skippedYouth).toBe(5);
    expect(parsed.results).toHaveLength(44);
    expect(parsed.results.every((row) => row.distance === "10k")).toBe(true);
    expect(parsed.results.filter((row) => row.sex === "female").length).toBeGreaterThan(0);
    expect(parsed.results.filter((row) => row.sex === "male").length).toBeGreaterThan(0);
    expect(new Set(parsed.results.map((row) => row.externalResultId)).size).toBe(44);
    const winner = parsed.results.find((row) => row.gunTimeMs === 1_828_000);
    expect(winner?.sex).toBe("male");
    expect(winner?.categoryKey).toBe("10k:male");
  });
});
