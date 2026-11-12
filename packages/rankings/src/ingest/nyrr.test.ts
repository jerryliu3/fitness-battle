import { describe, expect, it } from "vitest";
import { parseNyrrFinishersPage } from "./nyrr";

describe("parseNyrrFinishersPage", () => {
  it("namespaces runner ids and skips youth", () => {
    const page = parseNyrrFinishersPage(
      {
        totalItems: 3,
        items: [
          { runnerId: 1, firstName: "Ada", lastName: "Lovelace", bib: "42", gender: "W", overallTime: "3:30:00", age: 34 },
          { runnerId: 2, firstName: "Kid", lastName: "Runner", bib: "43", gender: "M", overallTime: "4:00:00", age: 16 },
          { runnerId: 3, firstName: "Bob", lastName: "Smith", bib: "44", gender: "M", overallTime: "2:58:00", age: 40 },
        ],
      },
      { eventCode: "M2026", distance: "marathon", sourceUrl: "https://results.nyrr.org/event/M2026/finishers", pageIndex: 1, pageSize: 100 },
    );
    expect(page.results).toHaveLength(2);
    expect(page.results[0]?.externalResultId).toBe("M2026:1");
    expect(page.skippedYouth).toBe(1);
    expect(page.rowKeys).toEqual(["M2026:1", "M2026:2", "M2026:3"]);
  });
});
