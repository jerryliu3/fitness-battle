import { raceCourseRacerPosition, raceCourseTrail, raceEffortMetres, type RaceCourse } from "./race-course";
import type { ArenaSceneLane } from "./arena-view";
import type { LngLat } from "./routeGeoUtils";

function buildCourseGeometry(course: RaceCourse, lanes: readonly ArenaSceneLane[], unit: string, spacing: number, anchorId: string) {
  const roster = lanes.filter(lane => !lane.ghost);
  const ids = roster.map(lane => lane.id).sort();
  const anchor = ids.includes(anchorId) ? anchorId : ids[0];
  const offsets = new Map([[anchor, 0]]);
  // The viewer owns the centerline; peers alternate to either side in stable ID order.
  ids.filter(id => id !== anchor).forEach((id, index) => offsets.set(id, (index % 2 ? 1 : -1) * (1 + Math.floor(index / 2)) * spacing));
  const athletes = roster.map(lane => {
    const metres = raceEffortMetres(lane.value, unit);
    return metres === null ? null : { ...lane, ...raceCourseRacerPosition(course, metres, offsets.get(lane.id)) };
  }).filter(athlete => athlete !== null);
  const trails = { type: "FeatureCollection" as const, features: athletes.filter(athlete => athlete.metres > 0).map(athlete => ({
    type: "Feature" as const, id: athlete.id,
    properties: { color: athlete.you ? "#f7c948" : "#20b9c6", priority: athlete.you ? 1 : 0 },
    geometry: { type: "LineString" as const, coordinates: raceCourseTrail(course, athlete.metres, athlete.lateralMetres) },
  })) };
  // Overview fits earned trails and current dots, never the unreached course.
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
  const include = (coordinate: LngLat) => {
    const lng = coordinate[0] + 360 * Math.round((course.coordinates[0][0] - coordinate[0]) / 360);
    west = Math.min(west, lng); east = Math.max(east, lng);
    south = Math.min(south, coordinate[1]); north = Math.max(north, coordinate[1]);
  };
  for (const athlete of athletes) include(athlete.coordinate);
  for (const trail of trails.features) for (const coordinate of trail.geometry.coordinates) include(coordinate);
  const overviewCoordinates: LngLat[] = athletes.length ? [[west, south], [east, north]] : [];
  return { athletes, trails, overviewCoordinates };
}
// Selection only updates dots and the camera; it must not resend every long trail to Mapbox.
const geometryCache = new WeakMap<RaceCourse, { lanes: readonly ArenaSceneLane[]; unit: string; spacing: number; anchor: string; geometry: ReturnType<typeof buildCourseGeometry> }>();
export function raceCourseScene(course: RaceCourse, lanes: readonly ArenaSceneLane[], unit: string, selectedId: string, spacingMetres = 1) {
  const anchor = lanes.find(lane => lane.you && !lane.ghost)?.id ?? "";
  let cached = geometryCache.get(course);
  if (!cached || cached.lanes !== lanes || cached.unit !== unit || cached.spacing !== spacingMetres || cached.anchor !== anchor) {
    cached = { lanes, unit, spacing: spacingMetres, anchor, geometry: buildCourseGeometry(course, lanes, unit, spacingMetres, anchor) };
    geometryCache.set(course, cached);
  }
  const { athletes, trails, overviewCoordinates } = cached.geometry;
  const selected = athletes.find(lane => lane.id === selectedId) ?? athletes.find(lane => lane.you) ?? athletes[0];
  return {
    selected, trails, overviewCoordinates,
    markers: { type: "FeatureCollection" as const, features: athletes.map(athlete => ({
      type: "Feature" as const, id: athlete.id,
      properties: { id: athlete.id, name: athlete.name, you: Boolean(athlete.you), selected: athlete.id === selected?.id },
      geometry: { type: "Point" as const, coordinates: athlete.coordinate },
    })) },
  };
}
