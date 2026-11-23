import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { chronotrackSplitsForProfile } from "./chronotrack-splits";
import { parseChronotrackResultsPage } from "./chronotrack";

const root = dirname(fileURLToPath(import.meta.url));

const LIST_SAMPLE = [
  {
    division: { totalAthletes: 2 },
    intervals: [
      {
        full: true,
        results: [
          {
            id: 79178197,
            age: 33,
            bib: "8",
            chipTimeInMillis: 8_784_650,
            gunTimeInMillis: 8_785_410,
            displayName: "Garrett Patrick",
            gender: "M",
            status: "CONF",
          },
          {
            id: 1,
            age: 16,
            bib: "9",
            chipTimeInMillis: 3_600_000,
            gunTimeInMillis: 3_600_000,
            displayName: "Young Runner",
            gender: "F",
            status: "CONF",
          },
        ],
      },
    ],
  },
];

describe("parseChronotrackResultsPage", () => {
  it("maps a finisher and drops athletes under 18", () => {
    const page = parseChronotrackResultsPage(LIST_SAMPLE, {
      distance: "marathon",
      eventId: 91608,
      sourceUrl: "https://live.chronotrack.com/event/91608/results",
    });
    expect(page.skippedYouth).toBe(1);
    expect(page.results).toHaveLength(1);
    expect(page.results[0]).toMatchObject({
      externalResultId: "79178197",
      athleteName: "Garrett Patrick",
      normalizedBib: "8",
      sex: "male",
      chipTimeMs: 8_784_650,
      gunTimeMs: 8_785_410,
      finishStatus: "finished",
    });
  });
});

describe("chronotrackSplitsForProfile", () => {
  it("aligns SF mile splits from the winner fixture", () => {
    const payload = JSON.parse(
      readFileSync(join(root, "../../fixtures/chronotrack-sf-winner-result.json"), "utf8"),
    );
    const aligned = chronotrackSplitsForProfile(payload, "marathon_sf_miles");
    expect(aligned.elapsedMs).toEqual([
      682_500,
      1_365_540,
      2_031_050,
      2_686_940,
      3_346_040,
      4_028_410,
      4_740_110,
      5_273_250,
      6_024_680,
      6_678_620,
      7_325_210,
      8_002_740,
      8_784_650,
    ]);
  });
});