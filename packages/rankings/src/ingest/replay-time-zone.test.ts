import { describe, expect, it } from "vitest";
import { replayTimeZoneForEdition } from "./replay-time-zone";

describe("replayTimeZoneForEdition", () => {
  it("resolves catalog events by name and year", () => {
    expect(replayTimeZoneForEdition("Tokyo Marathon 2026", 2026)).toBe("Asia/Tokyo");
    expect(replayTimeZoneForEdition("Boston Marathon 2026", 2026)).toBe("America/New_York");
  });

  it("falls back to name hints", () => {
    expect(replayTimeZoneForEdition("TCS Toronto Waterfront Marathon 2026", 2026)).toBe("America/Toronto");
  });
});