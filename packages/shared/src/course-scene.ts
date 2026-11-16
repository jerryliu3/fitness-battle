import { raceCourseRacerPosition, raceCourseTrail, raceEffortMetres, type RaceCourse } from "./race-course";
import { ordinalPlace, type ArenaSceneLane } from "./arena-view";
import { getAppColors } from "./appearance";
import type { LngLat } from "./routeGeoUtils";

export const RACE_LANE_SPACING_METRES = .42;
export const RACE_OVERLAY_WIDTH_PIXELS = 8;
export const RACE_SEPARATE_WIDTH_PIXELS = 4;
export const RACE_LOCAL_RADIUS_METRES = 1000;

/** Initial local ground span, independent of field totals. Perspective/terrain can
 * show more distant scenery; this estimates the flat-ground viewport footprint
 * using Mapbox's default vertical field of view (2 * atan(1/3)). */
export function courseInitialZoom(latitude: number, height: number, pitch: number) {
  const radians = pitch * Math.PI / 180;
  const perspective = 1 / (Math.cos(radians) * (1 - (Math.tan(radians) / 3) ** 2));
  return Math.max(0, Math.min(20, Math.log2(78271.516964 * Math.cos(latitude * Math.PI / 180) * (height > 0 ? height : 600) * perspective / (2 * RACE_LOCAL_RADIUS_METRES))));
}

/** Previews contain you and reachable rivals, never an entire distant field. */
export function coursePreviewLanes(lanes: readonly ArenaSceneLane[], unit: string) {
  const you = lanes.find(lane => lane.you && !lane.ghost);
  if (!you) return [];
  const metres = raceEffortMetres(you.value, unit);
  if (metres === null) return [];
  return lanes.filter(lane => {
    const at = raceEffortMetres(lane.value, unit);
    return !lane.ghost && at !== null && Math.abs(at - metres) <= RACE_LOCAL_RADIUS_METRES;
  });
}

/** First place is gold; every other athlete uses the comparison color. */
const leaderColor = (leader: boolean) => { const colors = getAppColors(); return leader ? colors.actionPrimary : colors.chartComparison; };

function buildCourseGeometry(course: RaceCourse, lanes: readonly ArenaSceneLane[], unit: string, spacing: number, anchorId: string) {
  const roster = lanes.filter(lane => !lane.ghost);
  const ids = roster.map(lane => lane.id).sort();
  const anchor = ids.includes(anchorId) ? anchorId : ids[0];
  const offsets = new Map([[anchor, 0]]);
  // The viewer owns the centerline; peers alternate to either side in stable ID order.
  ids.filter(id => id !== anchor).forEach((id, index) => offsets.set(id, (index % 2 ? 1 : -1) * (1 + Math.floor(index / 2)) * spacing));
  const leaderValue = Math.max(...roster.map(lane => lane.value));
  const athletes = roster.map(lane => {
    const metres = raceEffortMetres(lane.value, unit);
    return metres === null ? null : { ...lane, ...raceCourseRacerPosition(course, metres, offsets.get(lane.id)), leader: lane.value >= leaderValue };
  }).filter(athlete => athlete !== null);
  const trails = { type: "FeatureCollection" as const, features: athletes.filter(athlete => athlete.metres > 0).map(athlete => ({
    type: "Feature" as const, id: athlete.id,
    properties: { color: leaderColor(athlete.leader), priority: athlete.leader ? 1 : 0 },
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
export function raceCourseScene(course: RaceCourse, lanes: readonly ArenaSceneLane[], unit: string, selectedId: string, spacingMetres = RACE_LANE_SPACING_METRES) {
  const anchor = lanes.find(lane => lane.you && !lane.ghost)?.id ?? "";
  let cached = geometryCache.get(course);
  if (!cached || cached.lanes !== lanes || cached.unit !== unit || cached.spacing !== spacingMetres || cached.anchor !== anchor) {
    cached = { lanes, unit, spacing: spacingMetres, anchor, geometry: buildCourseGeometry(course, lanes, unit, lanes.some(lane => lane.mystery) ? Math.max(spacingMetres, 8) : spacingMetres, anchor) };
    geometryCache.set(course, cached);
  }
  const { athletes, trails, overviewCoordinates } = cached.geometry;
  const selected = athletes.find(lane => lane.id === selectedId) ?? athletes.find(lane => lane.you) ?? athletes[0];
  const calloutOrder = [...athletes].sort((a, b) => Number(Boolean(b.you)) - Number(Boolean(a.you)) || a.id.localeCompare(b.id));
  const slots = new Map(calloutOrder.map((athlete, index) => [athlete.id, index]));
  return {
    selected, trails, overviewCoordinates,
    callouts: athletes.map(athlete => ({ ...athlete, callout: courseCalloutLayout(slots.get(athlete.id) ?? 0) })),
    markers: { type: "FeatureCollection" as const, features: athletes.map(athlete => ({
      type: "Feature" as const, id: athlete.id,
      properties: { id: athlete.id, name: athlete.name, mystery: Boolean(athlete.mystery), you: Boolean(athlete.you), leader: athlete.leader, color: leaderColor(athlete.leader), selected: athlete.id === selected?.id },
      geometry: { type: "Point" as const, coordinates: athlete.coordinate },
    })) },
  };
}

/** Geographic cards show each athlete’s full earned distance. */
export function courseAthleteDetail(lanes: readonly ArenaSceneLane[], lane: ArenaSceneLane, unit: string) {
  if (lanes.some(peer => peer.mystery)) return "";
  const rank = 1 + lanes.filter(peer => !peer.ghost && peer.value > lane.value).length;
  return `${ordinalPlace(rank)} · ${lane.value.toFixed(1)} ${unit}`;
}

/** Stable screen-space tiers keep tied racers' cards from stacking on one another. */
export function courseCalloutLayout(slot: number) {
  const tier = Math.floor(slot / 2);
  const row = tier === 0 ? 0 : (tier % 2 ? -1 : 1) * Math.ceil(tier / 2);
  const left = slot % 2 === 0;
  const y = -100 + row * 54;
  const originY = 18 + Math.max(0, -y);
  const height = originY + Math.max(0, y + 48) + 2;
  return { left, y, originY, height, originX: left ? 170 : 0, cardTop: originY + y };
}

/** Ranked callers share the same compact roster in live fields and every replay. */
export function coursePositionLeaders<T extends { id: string; you?: boolean }>(ranked: readonly T[]): T[] {
  const leaders = ranked.slice(0, 3);
  const you = ranked.find(lane => lane.you);
  return you && !leaders.some(lane => lane.id === you.id) ? [...leaders, you] : leaders;
}
