import { createRaceCourse, raceCoordinate, type RaceCourse } from "./race-course";
import type { LngLat } from "./routeGeoUtils";

export function parseCourseWaypoint(input: string): LngLat | null {
  const parts = input.trim().split(",").map(value => value.trim());
  if (parts.length !== 2 || parts.some(value => !value)) return null;
  const coordinate = parts.map(Number);
  return raceCoordinate(coordinate) ? coordinate : null;
}
/** Requests happen only on explicit submission; tokens are existing public map tokens. */
export async function requestMapboxCourse(start: string, finish: string, profile: "walking" | "cycling", token: string, signal?: AbortSignal): Promise<RaceCourse> {
  if (!token) throw new Error("Mapbox is not configured.");
  if (!start.trim() || !finish.trim() || start.length > 240 || finish.length > 240) throw new Error("Enter a start and destination (up to 240 characters each).");
  async function resolve(query: string): Promise<LngLat> {
    const coordinate = parseCourseWaypoint(query);
    if (coordinate) return coordinate;
    const params = new URLSearchParams({ q: query, access_token: token, limit: "1", autocomplete: "false" });
    const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`, { signal });
    if (!response.ok) throw new Error("Place search is unavailable. Try longitude,latitude coordinates.");
    const json = await response.json() as { features?: { geometry?: { coordinates?: unknown } }[] };
    const result: unknown = json.features?.[0]?.geometry?.coordinates;
    if (!raceCoordinate(result)) throw new Error(`No location found for ${query}. Try a street address or coordinates.`);
    return result;
  }
  const [a, b] = await Promise.all([resolve(start), resolve(finish)]);
  const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/${profile}/${a.join(",")};${b.join(",")}?geometries=geojson&overview=full&exclude=ferry&access_token=${encodeURIComponent(token)}`, { signal });
  if (!response.ok) throw new Error("Route generation is unavailable. Try a closer start and destination.");
  const json = await response.json() as { code?: unknown; routes?: { geometry?: { coordinates?: unknown } }[] };
  const coordinates: unknown = json.routes?.[0]?.geometry?.coordinates;
  if (json.code !== "Ok" || !Array.isArray(coordinates) || !coordinates.every(raceCoordinate)) throw new Error("No continuous route was found between those locations.");
  return createRaceCourse(`${start.trim()} → ${finish.trim()}`, coordinates);
}
