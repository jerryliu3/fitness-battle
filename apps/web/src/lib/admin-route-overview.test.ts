import { expect, it } from "vitest";
import { buildAdminRouteOverview } from "./admin-route-overview";

const routes = [
  { id: "central-park-loop", name: "Central Park", location: "NY", is_active: true, updated_at: "2026-10-28T12:00:00Z" },
  { id: "marin-headlands-loop", name: "Marin", location: "CA", is_active: false, updated_at: "2026-10-28T12:00:00Z" },
];

it("summarizes frozen usage and whether an assignment matches catalog rotation", () => {
  const start = "2030-01-07T11:00:00.000Z";
  const overview = buildAdminRouteOverview(routes, [{
    wave_start: start,
    route_id: "central-park-loop",
    route_name: "Central Park",
    created_at: start,
  }], [], Date.parse("2029-01-01T00:00:00Z"));
  expect(overview.catalog[0].upcomingWeeks).toBe(1);
  expect(overview.assignments[0]?.matchesRotation).toBe(
    overview.assignments[0]?.route_id === overview.assignments[0]?.autoRouteId,
  );
  expect(overview.surfaces.some(surface => surface.id === "weekly-competition" && surface.managedOn === "server")).toBe(true);
});