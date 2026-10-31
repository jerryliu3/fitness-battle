import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("chart reference regressions", () => {
  it("compares recap bounds as instants across timestamp representations", () => {
    const source = readFileSync(new URL("../../../mobile/src/features/round-takeover.tsx", import.meta.url), "utf8");
    expect(source).toContain("Date.parse(a.startedAt) >= Date.parse(result.periodStart)");
    expect(source).toContain("Date.parse(a.startedAt) < Date.parse(result.periodEnd)");
    const start = "2026-10-19T04:00:00.000Z", end = "2026-10-26T04:00:00.000Z";
    const within = (at: string) => Date.parse(at) >= Date.parse(start) && Date.parse(at) < Date.parse(end);
    expect(within("2026-10-19T00:00:00-04:00")).toBe(true);
    expect(within("2026-10-26T04:00:00Z")).toBe(false);
    expect(within("2026-10-26T00:30:00-04:00")).toBe(false);
  });
  it("anchors both middle labels to their observation on each platform", () => {
    for (const path of ["../ui/standard-line-chart.tsx", "../../../mobile/src/ui/standard-line-chart.tsx"]) {
      const source = readFileSync(new URL(path, import.meta.url), "utf8");
      expect(source.match(/x: geo\.points\[Math\.floor\(\(values\.length - 1\) \/ 2\)\]!\.x, label:/g)).toHaveLength(2);
    }
  });
});
