import { describe, expect, it } from "vitest";
import { parseNyrrSplitResults } from "./nyrr-splits";

const SAMPLE = {
  runnerId: 56117513,
  bib: "4",
  splitResults: [
    { splitCode: "5K", time: "0:15:32" },
    { splitCode: "10K", time: "0:30:53" },
    { splitCode: "HALF", time: "1:03:06" },
    { splitCode: "MAR", time: "2:06:01" },
  ],
};

describe("parseNyrrSplitResults", () => {
  it("aligns cumulative NYRR split codes to the NYC profile", () => {
    const splits = parseNyrrSplitResults(SAMPLE, "marathon_nyc");
    const fiveK = splits.elapsedMs[splits.sourceLabels.indexOf("5K")];
    const finish = splits.elapsedMs[splits.sourceLabels.indexOf("MAR")];
    expect(fiveK).toBe(932_000);
    expect(finish).toBe(7_561_000);
  });
});