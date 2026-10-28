import { expect, it } from "vitest";
import { parseAdminRouteGpx, validateAdminRoute } from "./admin-route-input";
const input = { id: "park-loop", name: " Park ", location: " New York ", coordinates: [[0, 0], [0, 0], [.02, 0]], is_active: true, updatedAt: null };
it("validates catalog edits and normalizes geometry without accepting missing revisions", () => {
  expect(validateAdminRoute(input)).toMatchObject({ name: "Park", location: "New York", coordinates: [[0, 0], [.02, 0]], updatedAt: null });
  for (const patch of [{ id: "Bad ID" }, { name: " " }, { coordinates: [[0, 0], [999, 0]] }, { coordinates: [[0, 0], [0, 0]] }, { is_active: "true" }, { updatedAt: undefined }, { updatedAt: "bad" }]) {
    expect(() => validateAdminRoute({ ...input, ...patch })).toThrow();
  }
});
it("imports continuous GPX scenery including namespaced routes", () => {
  expect(parseAdminRouteGpx('<gpx><trk><trkseg><trkpt lat="0" lon="0"/><trkpt lat="0" lon=".02"/></trkseg></trk></gpx>')).toEqual([[0, 0], [.02, 0]]);
  expect(parseAdminRouteGpx('<g:gpx><g:rte><g:rtept lat="0" lon="0"/><g:rtept lat="0" lon=".02"/></g:rte></g:gpx>')).toEqual([[0, 0], [.02, 0]]);
});
it("rejects disconnected, declared, oversized or invalid GPX input", () => {
  for (const xml of ['<gpx><trkseg></trkseg><trkseg></trkseg></gpx>', '<!DOCTYPE gpx><gpx/>', '<gpx><rte><rtept lat="NaN" lon="0"/></rte></gpx>', '<gpx><rte><rtept lat="" lon="0"/></rte></gpx>', 'x'.repeat(4 * 1024 * 1024 + 1)]) expect(() => parseAdminRouteGpx(xml)).toThrow();
});
