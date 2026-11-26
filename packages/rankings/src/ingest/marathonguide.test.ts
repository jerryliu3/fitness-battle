import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  marathonGuideFinishersApiUrl,
  parseMarathonGuideFinishersPage,
  parseMarathonGuideResultsUrl,
} from "./marathonguide";

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures");

describe("marathonguide", () => {
  it("parses results URLs and builds the JSON finisher endpoint", () => {
    const url = "https://www.marathonguide.com/races/run/tokyo-marathon-copy/2025/results/";
    expect(parseMarathonGuideResultsUrl(url)).toEqual({
      raceSlug: "tokyo-marathon-copy",
      year: 2025,
    });
    expect(marathonGuideFinishersApiUrl("tokyo-marathon-copy", 2025, 2)).toContain(
      "/api/v1/races/tokyo-marathon-copy/2025/finishers",
    );
    expect(marathonGuideFinishersApiUrl("tokyo-marathon-copy", 2025, 2)).toContain("page=2");
  });

  it("parses finisher rows into ledger finishes", () => {
    const payload = JSON.parse(
      readFileSync(join(fixtureDir, "marathonguide-tokyo-page1.json"), "utf8"),
    );
    const parsed = parseMarathonGuideFinishersPage(payload, {
      distance: "marathon",
      sourceUrl: "https://www.marathonguide.com/races/run/tokyo-marathon-copy/2025/results/",
    });
    expect(parsed.results).toHaveLength(2);
    expect(parsed.results[0]!.chipTimeMs).toBeGreaterThan(7_000_000);
    expect(parsed.results[0]!.athleteName).toBe("Tadese Takele");
  });
});