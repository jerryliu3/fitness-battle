import { describe, expect, it } from "vitest";
import { pickRaceRouteIdByRotation, raceRouteCatalogIndex } from "./race-route-catalog";

describe("raceRouteCatalogIndex", () => {
  const ids = ["a", "b", "c"];

  it("rotates with the Unix week number of the wave start", () => {
    const start = "2026-10-27T10:00:00Z";
    const index = raceRouteCatalogIndex(start, ids.length)!;
    expect(ids[index]).toBe(pickRaceRouteIdByRotation(start, ids));
  });

  it("returns null when the active catalog is empty", () => {
    expect(raceRouteCatalogIndex("2026-10-27T10:00:00Z", 0)).toBeNull();
    expect(pickRaceRouteIdByRotation("2026-10-27T10:00:00Z", [])).toBeNull();
  });
});