import { bearing, destination, distance, point } from "@turf/turf";
import type { LngLat } from "./routeGeoUtils";

export interface RaceCourse {
  name: string;
  coordinates: LngLat[];
  /** Prefix distances in metres; build once, then seek in O(log n). */
  metres: number[];
  length: number;
}
export const MAX_COURSE_POINTS = 20_000;
export function raceCoordinate(value: unknown): value is LngLat {
  return Array.isArray(value) && value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number" && Number.isFinite(value[0]) && Number.isFinite(value[1]) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 85;
}
export function createRaceCourse(name: string, input: readonly LngLat[]): RaceCourse {
  if (input.length > MAX_COURSE_POINTS) throw new Error("Use a course with at most 20,000 points.");
  const coordinates: LngLat[] = [], metres = [0];
  for (const coordinate of input) {
    if (!raceCoordinate(coordinate)) throw new Error("The course contains an invalid map coordinate.");
    const previous = coordinates.at(-1);
    const gap = previous ? distance(previous, coordinate, { units: "meters" }) : 0;
    if (previous && gap < .01) continue;
    if (previous) metres.push(metres.at(-1)! + gap);
    coordinates.push([coordinate[0], coordinate[1]]);
  }
  if (coordinates.length < 2 || metres.at(-1)! < 1) throw new Error("The course needs at least two distinct points and one metre of distance.");
  return { name: name.trim().slice(0, 120) || "Race course", coordinates, metres, length: metres.at(-1)! };
}

function segmentAt(course: RaceCourse, metres: number) {
  let low = 0, high = course.metres.length - 1;
  while (low + 1 < high) { const middle = (low + high) >>> 1; if (course.metres[middle] <= metres) low = middle; else high = middle; }
  return low;
}
export function raceCoursePosition(course: RaceCourse, progress: number) {
  const metres = Math.max(0, Number.isFinite(progress) ? progress : 0);
  const cycle = metres % (2 * course.length);
  const returning = cycle >= course.length;
  const routeMetres = returning ? 2 * course.length - cycle : cycle;
  let segment = segmentAt(course, routeMetres);
  if (returning && segment > 0 && routeMetres === course.metres[segment]) segment--;
  const a = course.coordinates[segment], b = course.coordinates[segment + 1];
  const forwardHeading = bearing(a, b);
  const coordinate = routeMetres === course.length ? course.coordinates.at(-1)! : destination(point(a), routeMetres - course.metres[segment], forwardHeading, { units: "meters" }).geometry.coordinates as LngLat;
  return { coordinate, heading: returning ? bearing(b, a) : forwardHeading, metres, routeMetres, returning, segment };
}
// Geometry is cached lazily: no offset work for the unreached part of a long route.
const laneCoordinates = new WeakMap<RaceCourse, Map<number, LngLat[]>>();
const laneHeadings = new WeakMap<RaceCourse, number[]>();
function laneCoordinate(course: RaceCourse, index: number, offset: number): LngLat {
  if (!offset) return course.coordinates[index];
  let lanes = laneCoordinates.get(course);
  if (!lanes) { lanes = new Map(); laneCoordinates.set(course, lanes); }
  let coordinates = lanes.get(offset);
  if (!coordinates) { coordinates = []; lanes.set(offset, coordinates); }
  if (coordinates[index]) return coordinates[index];
  let headings = laneHeadings.get(course);
  if (!headings) { headings = []; laneHeadings.set(course, headings); }
  if (headings[index] === undefined) {
    const metres = course.metres[index];
    const before = raceCoursePosition(course, Math.max(0, metres - 5));
    const after = raceCoursePosition(course, Math.min(course.length, metres + 5));
    headings[index] = bearing(before.coordinate, after.coordinate);
  }
  return coordinates[index] = destination(point(course.coordinates[index]), Math.abs(offset), headings[index] + (offset > 0 ? 90 : -90), { units: "meters" }).geometry.coordinates as LngLat;
}
/** Markers interpolate along the very same offset polyline used by their trails. */
export function raceCourseRacerPosition(course: RaceCourse, progress: number, lateralMetres = 0) {
  const position = raceCoursePosition(course, progress);
  if (!lateralMetres) return { ...position, lateralMetres: 0 };
  const a = laneCoordinate(course, position.segment, lateralMetres);
  const b = laneCoordinate(course, position.segment + 1, lateralMetres);
  const fraction = (position.routeMetres - course.metres[position.segment]) / (course.metres[position.segment + 1] - course.metres[position.segment]);
  const coordinate = fraction === 1 ? b : fraction === 0 ? a : destination(point(a), distance(a, b, { units: "meters" }) * fraction, bearing(a, b), { units: "meters" }).geometry.coordinates as LngLat;
  return { ...position, coordinate, lateralMetres };
}
export function raceCourseTrail(course: RaceCourse, progress: number, lateralMetres = 0): LngLat[] {
  const position = raceCourseRacerPosition(course, progress, lateralMetres);
  if (position.metres === 0) return [];
  const coordinates: LngLat[] = [];
  if (position.metres >= course.length) {
    // One full traversal plus the current partial leg covers all earned scenery.
    // Geometry stays bounded even after thousands of return trips, and ends at the dot.
    if (position.returning) {
      for (let i = 0; i < course.coordinates.length; i++) coordinates.push(laneCoordinate(course, i, lateralMetres));
      for (let i = course.coordinates.length - 2; i > position.segment; i--) coordinates.push(laneCoordinate(course, i, lateralMetres));
    } else {
      for (let i = course.coordinates.length - 1; i >= 0; i--) coordinates.push(laneCoordinate(course, i, lateralMetres));
      for (let i = 1; i <= position.segment; i++) coordinates.push(laneCoordinate(course, i, lateralMetres));
    }
  } else {
    for (let i = 0; i <= position.segment; i++) coordinates.push(laneCoordinate(course, i, lateralMetres));
  }
  coordinates.push(position.coordinate);
  return coordinates;
}
export function raceEffortMetres(value: number, unit: string): number | null {
  return unit === "km" ? Math.max(0, value) * 1000 : unit === "mi" ? Math.max(0, value) * 1609.344 : null;
}
/** Explicit overview command, in the host's display units. A request can repeat the same target after panning. */
export interface CourseDistanceTarget { value: number; request: number }
export type CourseDimension = "2d" | "3d";
export interface CourseCameraPose { center: LngLat; zoom: number; pitch: number; bearing: number }
export interface CourseCameraDriver {
  read(): CourseCameraPose;
  move(pose: CourseCameraPose, duration: number): void;
  stop(userGesture?: boolean): void;
  fit?(bounds: { ne: LngLat; sw: LngLat }, duration: number): void;
}
/** One owner for both platforms. Native engines own every frame between camera commands. */
export function createCourseCamera(driver: CourseCameraDriver, reducedMotion = false) {
  let following = true;
  let dimension: CourseDimension = "3d";
  const move = (pose: CourseCameraPose, automatic = false) => {
    const from = driver.read();
    const metres = distance(from.center, pose.center, { units: "meters" });
    driver.stop();
    driver.move(pose, reducedMotion ? 0 : automatic ? 500 : Math.min(1800, 400 + 180 * Math.log2(1 + metres / 30)));
  };
  return {
    interrupt() { following = false; driver.stop(true); },
    setReducedMotion(value: boolean) { reducedMotion = value; driver.stop(); },
    focus(course: RaceCourse, metres: number, automatic = false, lateralMetres = 0) {
      if (automatic && !following) return;
      if (!automatic) following = true;
      const position = raceCoursePosition(course, metres), current = driver.read();
      // Look forward along bends rather than abruptly adopting the next segment's heading.
      const remaining = position.returning ? position.routeMetres : course.length - position.routeMetres;
      const ahead = raceCoursePosition(course, position.metres + Math.min(30, remaining));
      const heading = remaining > .01 ? bearing(position.coordinate, ahead.coordinate) : position.heading;
      move({ ...current, center: raceCourseRacerPosition(course, metres, lateralMetres).coordinate, pitch: dimension === "3d" ? 60 : 0, bearing: dimension === "3d" ? heading : 0 }, automatic);
    },
    seek(course: RaceCourse, metres: number) {
      following = false;
      const current = driver.read();
      driver.stop();
      // Scrubbing is direct manipulation: no queued flights, zoom reset or heading changes.
      driver.move({ ...current, center: raceCoursePosition(course, metres).coordinate }, 0);
    },
    dimension(value: CourseDimension) { dimension = value; move({ ...driver.read(), pitch: value === "3d" ? 60 : 0, bearing: value === "2d" ? 0 : driver.read().bearing }); },
    zoom(delta: number) { following = false; const current = driver.read(); move({ ...current, zoom: Math.max(0, Math.min(20, current.zoom + delta)) }); },
    overview(course: Pick<RaceCourse, "coordinates">) {
      following = false;
      dimension = "2d";
      if (!course.coordinates.length) return;
      const unwrapped = course.coordinates.map(c => c[0] + 360 * Math.round((course.coordinates[0][0] - c[0]) / 360));
      const north = Math.max(...course.coordinates.map(c => c[1])), south = Math.min(...course.coordinates.map(c => c[1]));
      const east = Math.max(...unwrapped), west = Math.min(...unwrapped);
      if (east === west && north === south) { move({ ...driver.read(), center: course.coordinates[0], zoom: Math.min(18, driver.read().zoom), pitch: 0, bearing: 0 }); return; }
      if (driver.fit) { driver.stop(); driver.fit({ ne: [east, north], sw: [west, south] }, reducedMotion ? 0 : 900); return; }
      const center: LngLat = [(east + west) / 2, (north + south) / 2];
      // A conservative fit for phone-width viewports, including routes crossing the date line.
      const extent = Math.max(east - west, (north - south) / Math.max(.08, Math.cos(center[1] * Math.PI / 180)), .001);
      move({ center, zoom: Math.max(0, Math.min(18, Math.log2(180 / extent) - 1)), pitch: 0, bearing: 0 });
    },
    get following() { return following; },
  };
}
