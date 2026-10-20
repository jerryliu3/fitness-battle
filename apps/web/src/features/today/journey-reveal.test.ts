import { describe, expect, it } from "vitest";
import { newJourneyStops } from "./journey-reveal";

describe("journey reveal identity", () => {
  it("establishes existing history without replaying every circle", () => {
    expect(newJourneyStops(null, ["today:2026-10-19", "day:18", "day:17"])).toEqual(["today:2026-10-19"]);
  });
  it("does not replay on reload or return to Home", () => {
    expect(newJourneyStops(["today:2026-10-19", "day:18"], ["today:2026-10-19", "day:18"])).toEqual([]);
  });
  it("reveals the next day's Today and a newly counted session once", () => {
    expect(newJourneyStops(["today:2026-10-19", "day:18"], ["today:2026-10-20", "day:19", "day:18"])).toEqual(["today:2026-10-20", "day:19"]);
  });
});
