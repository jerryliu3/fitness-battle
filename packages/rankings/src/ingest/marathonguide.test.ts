import { describe, expect, it } from "vitest";
import { parseMarathonGuideApiPage, MARATHONGUIDE_TOKYO_2026 } from "./marathonguide";

describe("parseMarathonGuideApiPage", () => {
  it("maps Runzy rows to mg: external ids", () => {
    const page = parseMarathonGuideApiPage(
      {
        results: [
          {
            id: 14547042,
            full_name: "Tadese TAKELE",
            bib: "5",
            sex: "M",
            chip_time: "02:03:36",
            final_time: "02:03:37",
          },
        ],
        pagination: { total: 1, last_page: 1, per_page: 100 },
      },
      { config: MARATHONGUIDE_TOKYO_2026, pageIndex: 1, pageSize: 100 },
    );
    expect(page.results).toHaveLength(1);
    expect(page.results[0]?.externalResultId).toBe("mg:14547042");
    expect(page.results[0]?.chipTimeMs).toBe(7_416_000);
  });
});