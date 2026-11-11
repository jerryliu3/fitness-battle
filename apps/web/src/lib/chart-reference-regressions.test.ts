import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("chart reference regressions", () => {
  // Recap interval/DST behavior is exercised by shared/week-recap.test.ts.
  it("anchors both middle labels to their observation on each platform", () => {
    for (const path of ["../ui/standard-line-chart.tsx", "../../../mobile/src/ui/standard-line-chart.tsx"]) {
      const source = readFileSync(new URL(path, import.meta.url), "utf8");
      expect(source.match(/x: xAt\(Math\.floor\(\(values\.length - 1\) \/ 2\)\), label:/g)).toHaveLength(2);
    }
  });
});
