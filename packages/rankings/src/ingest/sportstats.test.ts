import { describe, expect, it } from "vitest";
import { parseSportstatsResultsPage, SPORTSTATS_TORONTO_2026 } from "./sportstats";

describe("parseSportstatsResultsPage", () => {
  it("parses chip time and identity from leaderboard row", () => {
    const page = parseSportstatsResultsPage(
      {
        ok: true,
        info: { total: 2, returned: 1 },
        participantData: [
          {
            pid: 30870,
            bib: "1",
            dn: "Leonard Langat",
            pc: "m30-34",
            ot: 7_610_906,
          },
        ],
      },
      { config: SPORTSTATS_TORONTO_2026, offset: 0, pageSize: 100, authoritativeTotal: 2 },
    );
    expect(page.results).toHaveLength(1);
    expect(page.results[0]?.externalResultId).toBe("ss:146034:30870");
    expect(page.results[0]?.chipTimeMs).toBe(7_610_906);
    expect(page.results[0]?.sex).toBe("male");
  });
});