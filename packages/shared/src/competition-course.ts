import { createRaceCourse, type RaceCourse } from "./race-course";
import type { LngLat } from "./routeGeoUtils";
import { bundledMarathonRaceCourse } from "./marathon-race-routes";

/** Local preview only. Live competitions always read a stored assignment. */
export const DEMO_RACE_COURSE = bundledMarathonRaceCourse();

/** Validate the database assignment before passing its geometry to a map. */
export function raceCourseFromAssignment(value: unknown, periodStart: string, periodEnd: string): RaceCourse {
  if (!value || typeof value !== "object") throw new Error("The weekly course is unavailable.");
  const row = value as Record<string, unknown>;
  if (typeof row.name !== "string" || !Array.isArray(row.coordinates)
    || typeof row.periodStart !== "string" || typeof row.periodEnd !== "string"
    || Date.parse(row.periodStart) !== Date.parse(periodStart)
    || Date.parse(row.periodEnd) !== Date.parse(periodEnd)) throw new Error("The weekly course is invalid.");
  return createRaceCourse(row.name, row.coordinates as LngLat[]);
}
