import { dayKey, weeklyPeriodBounds } from "./period";
import { createRaceCourse, type RaceCourse } from "./race-course";
import type { LngLat } from "./routeGeoUtils";
import { SAMPLE_ROUTES } from "./sampleRoute";

/** Shared scenery library. Every athlete sees the same course for an Eastern week. */
export const WEEKLY_RACE_COURSES = SAMPLE_ROUTES.map(route => ({
  id: route.id,
  location: route.location,
  course: createRaceCourse(route.name, route.coordinates),
}));

export function weeklyRaceCourse(anchor: Date = new Date()) {
  const monday = dayKey(weeklyPeriodBounds(anchor).startsAt);
  const [year, month, day] = monday.split("-").map(Number);
  const week = Math.floor(Date.UTC(year!, month! - 1, day!) / 86_400_000 / 7);
  return WEEKLY_RACE_COURSES[((week % WEEKLY_RACE_COURSES.length) + WEEKLY_RACE_COURSES.length) % WEEKLY_RACE_COURSES.length]!.course;
}

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
