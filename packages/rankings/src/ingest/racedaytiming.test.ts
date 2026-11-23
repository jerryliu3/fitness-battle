import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseRaceDayTimingList } from "./racedaytiming";

const fixture = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../fixtures/racedaytiming-banff-half-row.html"),
  "utf8",
);

describe("parseRaceDayTimingList", () => {
  it("parses winner row", () => {
    const page = parseRaceDayTimingList(fixture, {
      distance: "half_marathon",
      sourceUrl: "https://www.racedaytiming.ca/en/races/2026/banffhalf/event/Half",
    });
    expect(page.inputCount).toBe(1);
    expect(page.results).toHaveLength(1);
    const row = page.results[0]!;
    expect(row.externalResultId).toBe("1063");
    expect(row.athleteName).toBe("Andrew TAYLOR");
    expect(row.chipTimeMs).toBe((1 * 3600 + 11 * 60 + 30) * 1000);
    expect(row.normalizedBib).toBe("1063");
    expect(row.sex).toBe("male");
  });
});