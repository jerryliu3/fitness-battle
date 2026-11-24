import { raceCourseRacerPosition, raceCourseTrail, raceEffortMetres, type RaceCourse } from "./race-course";
import { formatActivityRecencyShort, isActivityLive } from "./activity-age";
import { ordinalPlace, type ArenaSceneLane } from "./arena-view";
import { MEDAL_GOLD, getAppColors } from "./appearance";
import type { LngLat } from "./routeGeoUtils";

export const RACE_LANE_SPACING_METRES = .42;
export const RACE_OVERLAY_WIDTH_PIXELS = 8;
export const RACE_SEPARATE_WIDTH_PIXELS = 4;
export const RACE_SELECTED_RADIUS_PIXELS = 9;
export const RACE_ATHLETE_RADIUS_PIXELS = 7;
export const RACE_LOCAL_RADIUS_METRES = 250;

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

/** First place is brand gold in every appearance mode; peers use the comparison color. */
const leaderColor = (leader: boolean) => (leader ? MEDAL_GOLD.srgb : getAppColors().chartComparison);

function courseOverviewCoordinates(
  course: RaceCourse,
  athletes: readonly { coordinate: LngLat }[],
  trails: { features: readonly { geometry: { coordinates: readonly LngLat[] } }[] },
): LngLat[] {
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
  const include = (coordinate: LngLat) => {
    const lng = coordinate[0] + 360 * Math.round((course.coordinates[0][0] - coordinate[0]) / 360);
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, coordinate[1]);
    north = Math.max(north, coordinate[1]);
  };
  for (const athlete of athletes) include(athlete.coordinate);
  for (const trail of trails.features) {
    for (const coordinate of trail.geometry.coordinates) include(coordinate);
  }
  return athletes.length ? [[west, south], [east, north]] : [];
}

function courseLaneSpacing(lanes: readonly ArenaSceneLane[]) {
  return lanes.some((lane) => lane.mystery) ? Math.max(RACE_LANE_SPACING_METRES, 8) : RACE_LANE_SPACING_METRES;
}

/** Symmetric lateral offsets for multiple athletes sharing the route start (0 m along-route). */
function startLineLateralOffsets(roster: readonly { id: string; metres: number; you?: boolean }[], spacing: number) {
  const offsets = new Map(roster.map((lane) => [lane.id, 0]));
  const atStart = roster.filter((lane) => lane.metres === 0);
  if (atStart.length < 2) return offsets;
  const ids = atStart.map((lane) => lane.id).sort();
  const you = atStart.find(lane => lane.you)?.id;
  if (you) { ids.splice(ids.indexOf(you), 1); ids.splice(Math.floor(ids.length / 2), 0, you); }
  ids.forEach((id, index) => offsets.set(id, (index - (ids.length - 1) / 2) * spacing));
  return offsets;
}

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
  return {
    athletes,
    trails,
    overviewCoordinates: courseOverviewCoordinates(course, athletes, trails),
  };
}

/** Shared-lane profile view: one centerline trail for the focused athlete; rivals float on-route. */
function buildSharedProfileLaneGeometry(
  course: RaceCourse,
  lanes: readonly ArenaSceneLane[],
  unit: string,
  selectedId: string,
) {
  const roster = lanes.filter((lane) => !lane.ghost);
  const leaderValue = Math.max(...roster.map((lane) => lane.value));
  const prepared = roster
    .map((lane) => {
      const metres = raceEffortMetres(lane.value, unit);
      return metres === null ? null : { lane, metres };
    })
    .filter((entry): entry is { lane: ArenaSceneLane; metres: number } => entry !== null);
  const offsets = startLineLateralOffsets(
    prepared.map(({ lane, metres }) => ({ id: lane.id, metres, you: lane.you })),
    Math.max(courseLaneSpacing(roster), 8),
  );
  const athletes = prepared.map(({ lane, metres }) => ({
    ...lane,
    ...raceCourseRacerPosition(course, metres, offsets.get(lane.id) ?? 0),
    leader: lane.value >= leaderValue,
  }));
  const explicitSelected = selectedId
    ? athletes.find((lane) => lane.id === selectedId)
    : undefined;
  const leader = athletes.reduce<typeof athletes[number] | undefined>(
    (best, lane) => (!best || lane.metres > best.metres ? lane : best),
    undefined,
  );
  const trailTarget = explicitSelected ?? leader;
  const trails = {
    type: "FeatureCollection" as const,
    features:
      trailTarget && trailTarget.metres > 0
        ? [
            {
              type: "Feature" as const,
              id: trailTarget.id,
              properties: {
                color: leaderColor(trailTarget.leader),
                priority: trailTarget.leader ? 1 : 0,
              },
              geometry: {
                type: "LineString" as const,
                coordinates: raceCourseTrail(course, trailTarget.metres, trailTarget.lateralMetres),
              },
            },
          ]
        : [],
  };
  return {
    athletes,
    trails,
    overviewCoordinates: courseOverviewCoordinates(course, athletes, trails),
  };
}

// Selection only updates dots and the camera; it must not resend every long trail to Mapbox.
const geometryCache = new WeakMap<
  RaceCourse,
  {
    lanes: readonly ArenaSceneLane[];
    unit: string;
    sharedProfileLane: boolean;
    anchor: string;
    selectedId?: string;
    geometry: ReturnType<typeof buildCourseGeometry>;
  }
>();
export function raceCourseScene(
  course: RaceCourse,
  lanes: readonly ArenaSceneLane[],
  unit: string,
  selectedId: string,
  sharedProfileLane = true,
) {
  const anchor = lanes.find((lane) => lane.you && !lane.ghost)?.id ?? "";
  let cached = geometryCache.get(course);
  if (
    !cached ||
    cached.lanes !== lanes ||
    cached.unit !== unit ||
    cached.sharedProfileLane !== sharedProfileLane ||
    cached.anchor !== anchor ||
    (sharedProfileLane && cached.selectedId !== selectedId)
  ) {
    const geometry = sharedProfileLane
      ? buildSharedProfileLaneGeometry(course, lanes, unit, selectedId)
      : buildCourseGeometry(
          course,
          lanes,
          unit,
          courseLaneSpacing(lanes),
          anchor,
        );
    cached = {
      lanes,
      unit,
      sharedProfileLane,
      anchor,
      selectedId: sharedProfileLane ? selectedId : undefined,
      geometry,
    };
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

export function courseAthleteSubdetail(
  _lanes: readonly ArenaSceneLane[],
  lane: ArenaSceneLane,
  unit: string,
  now: Date = new Date(),
): string | undefined {
  if (_lanes.some(peer => peer.mystery) || lane.ghost) return undefined;
  const volume = lane.lastActivityVolume;
  const recency = formatActivityRecencyShort(lane.lastUpdated, now);
  if (volume === undefined || !recency) return undefined;
  return `+${volume.toFixed(1)} ${unit} • ${recency}`;
}

export function courseAthleteSubdetailLive(
  lane: ArenaSceneLane,
  now: Date = new Date(),
): boolean {
  return isActivityLive(lane.lastUpdated, now);
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
