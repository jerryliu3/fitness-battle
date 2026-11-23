import { describe, expect, it } from "vitest";
import { MARATHON_RACE_ROUTE_CATALOG, marathonRaceRouteAt } from "./marathon-race-routes";
import { weeklyRaceRouteIndex } from "./race-route-rotation";

describe("marathon race routes", () => {
  it("rotates weekly across the sorted catalog", () => {
    expect(MARATHON_RACE_ROUTE_CATALOG.length).toBeGreaterThan(1);
    const epoch = Date.parse("2026-11-17T12:00:00.000Z");
    const idx = weeklyRaceRouteIndex(epoch, MARATHON_RACE_ROUTE_CATALOG.length);
    const route = marathonRaceRouteAt(epoch);
    expect(route.id).toBe(
      [...MARATHON_RACE_ROUTE_CATALOG].sort((a, b) => a.id.localeCompare(b.id))[idx]!.id,
    );
  });
});