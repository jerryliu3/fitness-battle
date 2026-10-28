import { createRaceCourse, MAX_COURSE_POINTS, type LngLat } from "@fitness-battle/shared";

export const MAX_ADMIN_ROUTE_BYTES = 4 * 1024 * 1024;
export const ROUTE_ID = /^[a-z0-9-]{3,80}$/;
export interface AdminRaceRoute {
  id: string; name: string; location: string; coordinates: LngLat[];
  is_active: boolean; updated_at: string;
}
export type AdminRaceRouteSummary = Omit<AdminRaceRoute, "coordinates">;

export function validateAdminRoute(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Enter a route.");
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || !ROUTE_ID.test(row.id)) throw new Error("Use a route ID with 3–80 lowercase letters, numbers or hyphens.");
  if (typeof row.name !== "string" || !row.name.trim() || row.name.trim().length > 120) throw new Error("Enter a name of at most 120 characters.");
  if (typeof row.location !== "string" || row.location.trim().length > 160) throw new Error("Use a location of at most 160 characters.");
  if (typeof row.is_active !== "boolean" || !Array.isArray(row.coordinates) || row.coordinates.length > MAX_COURSE_POINTS) throw new Error("Enter valid route coordinates and availability.");
  if (row.updatedAt !== null && (typeof row.updatedAt !== "string" || !Number.isFinite(Date.parse(row.updatedAt)))) throw new Error("Reload the route before saving.");
  const course = createRaceCourse(row.name, row.coordinates as LngLat[]);
  return { id: row.id, name: course.name, location: row.location.trim(), coordinates: course.coordinates, is_active: row.is_active, updatedAt: row.updatedAt as string | null };
}

/** Admin scenery import only; one continuous track or route, no activity writes. */
export function parseAdminRouteGpx(xml: string) {
  if (xml.length > MAX_ADMIN_ROUTE_BYTES || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Use a GPX under 4 MB without document declarations.");
  const clean = xml.replace(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g, "");
  if (!/<(?:\w+:)?gpx\b/i.test(clean)) throw new Error("Choose a GPX file.");
  const segments = [...clean.matchAll(/<(?:\w+:)?(trkseg|rte)\b[^>]*>([\s\S]*?)<\/(?:\w+:)?\1\s*>/gi)];
  if (segments.length !== 1) throw new Error("Choose a GPX with one continuous track segment or route.");
  const tag = segments[0]![1].toLowerCase() === "rte" ? "rtept" : "trkpt";
  const coordinates: LngLat[] = [];
  for (const match of segments[0]![2].matchAll(new RegExp(`<(?:\\w+:)?${tag}\\b([^>]*)>`, "gi"))) {
    const lat = /\blat\s*=\s*["']([^"']+)["']/i.exec(match[1])?.[1];
    const lon = /\blon\s*=\s*["']([^"']+)["']/i.exec(match[1])?.[1];
    if (!lat?.trim() || !lon?.trim()) throw new Error("Every point needs latitude and longitude.");
    coordinates.push([Number(lon), Number(lat)]);
    if (coordinates.length > MAX_COURSE_POINTS) throw new Error("Use at most 20,000 points.");
  }
  return createRaceCourse("Imported course", coordinates).coordinates;
}
