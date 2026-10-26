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
export const MAX_COURSE_BYTES = 4 * 1024 * 1024;
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

/** Routes are scenery, never activity imports. Reject disconnected segments instead of inventing connectors. */
export function raceCourseFromGpx(xml: string, name = "GPX course"): RaceCourse {
  if (xml.length > MAX_COURSE_BYTES || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Use a GPX file under 4 MB without document declarations.");
  const clean = xml.replace(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g, "");
  if (!/<(?:\w+:)?gpx\b/i.test(clean)) throw new Error("Choose a GPX file.");
  const segments = [...clean.matchAll(/<(?:\w+:)?(trkseg|rte)\b[^>]*>([\s\S]*?)<\/(?:\w+:)?\1\s*>/gi)];
  if (segments.length !== 1) throw new Error("Choose a GPX with one continuous track segment or route.");
  const coordinates: LngLat[] = [];
  const tag = segments[0]![1].toLowerCase() === "rte" ? "rtept" : "trkpt";
  for (const match of segments[0]![2].matchAll(new RegExp(`<(?:\\w+:)?${tag}\\b([^>]*)>`, "gi"))) {
    const attrs = match[1];
    const lat = /\blat\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
    const lon = /\blon\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
    if (!lat?.trim() || !lon?.trim()) throw new Error("Every course point needs latitude and longitude.");
    coordinates.push([Number(lon), Number(lat)]);
    if (coordinates.length > MAX_COURSE_POINTS) throw new Error("Use a course with at most 20,000 points.");
  }
  return createRaceCourse(name, coordinates);
}

function segmentAt(course: RaceCourse, metres: number) {
  let low = 0, high = course.metres.length - 1;
  while (low + 1 < high) { const middle = (low + high) >>> 1; if (course.metres[middle] <= metres) low = middle; else high = middle; }
  return low;
}
export function raceCoursePosition(course: RaceCourse, progress: number) {
  const metres = Math.max(0, Math.min(course.length, Number.isFinite(progress) ? progress : 0));
  const segment = segmentAt(course, metres), a = course.coordinates[segment], b = course.coordinates[segment + 1];
  const heading = bearing(a, b);
  const coordinate = metres === course.length ? course.coordinates.at(-1)! : destination(point(a), metres - course.metres[segment], heading, { units: "meters" }).geometry.coordinates as LngLat;
  return { coordinate, heading, metres, finished: metres >= course.length, segment };
}
export function raceCourseTrail(course: RaceCourse, progress: number): LngLat[] {
  const position = raceCoursePosition(course, progress);
  return [...course.coordinates.slice(0, position.segment + 1), position.coordinate];
}
export function raceEffortMetres(value: number, unit: string): number | null {
  return unit === "km" ? Math.max(0, value) * 1000 : unit === "mi" ? Math.max(0, value) * 1609.344 : null;
}
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
    focus(course: RaceCourse, metres: number, automatic = false) {
      if (automatic && !following) return;
      if (!automatic) following = true;
      const position = raceCoursePosition(course, metres), current = driver.read();
      // Look forward along bends rather than abruptly adopting the next segment's heading.
      const ahead = raceCoursePosition(course, Math.min(course.length, position.metres + 30));
      const heading = ahead.metres > position.metres ? bearing(position.coordinate, ahead.coordinate) : position.heading;
      move({ ...current, center: position.coordinate, pitch: dimension === "3d" ? 60 : 0, bearing: dimension === "3d" ? heading : 0 }, automatic);
    },
    dimension(value: CourseDimension) { dimension = value; move({ ...driver.read(), pitch: value === "3d" ? 60 : 0, bearing: value === "2d" ? 0 : driver.read().bearing }); },
    zoom(delta: number) { following = false; const current = driver.read(); move({ ...current, zoom: Math.max(2, Math.min(20, current.zoom + delta)) }); },
    overview(course: RaceCourse) {
      following = false;
      dimension = "2d";
      const unwrapped = course.coordinates.map(c => c[0] + 360 * Math.round((course.coordinates[0][0] - c[0]) / 360));
      const north = Math.max(...course.coordinates.map(c => c[1])), south = Math.min(...course.coordinates.map(c => c[1]));
      const east = Math.max(...unwrapped), west = Math.min(...unwrapped);
      if (driver.fit) { driver.stop(); driver.fit({ ne: [east, north], sw: [west, south] }, reducedMotion ? 0 : 900); return; }
      const center: LngLat = [(east + west) / 2, (north + south) / 2];
      // A conservative fit for phone-width viewports, including routes crossing the date line.
      const extent = Math.max(east - west, (north - south) / Math.max(.08, Math.cos(center[1] * Math.PI / 180)), .001);
      move({ center, zoom: Math.max(0, Math.min(18, Math.log2(180 / extent) - 1)), pitch: 0, bearing: 0 });
    },
    get following() { return following; },
  };
}
