import { createRaceCourse, type RaceCourse } from "./race-course";
import type { LngLat } from "./routeGeoUtils";
import { onboardingOvertakeCourse } from "./onboarding-overtake";

export const ONBOARDING_OVERTAKE_SURFACE_ID = "onboarding-overtake";

/** Bundled fallback; always available offline and on first paint. */
export const bundledOnboardingCourse = (): RaceCourse => onboardingOvertakeCourse;

export function parseRouteSurfaceCourse(value: unknown): RaceCourse | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.name !== "string" || !Array.isArray(row.coordinates)) return null;
  try {
    return createRaceCourse(row.name, row.coordinates as LngLat[]);
  } catch {
    return null;
  }
}

let cachedOnboardingCourse: RaceCourse | null = null;

export function readOnboardingCourseCache(): RaceCourse | null {
  return cachedOnboardingCourse;
}

export function storeOnboardingCourseCache(course: RaceCourse) {
  cachedOnboardingCourse = course;
}

export function clearOnboardingCourseCache() {
  cachedOnboardingCourse = null;
}

export function resolveOnboardingCourse(): RaceCourse {
  return cachedOnboardingCourse ?? bundledOnboardingCourse();
}

export async function prefetchOnboardingCourse(load: () => Promise<unknown>): Promise<RaceCourse | null> {
  try {
    const course = parseRouteSurfaceCourse(await load());
    if (!course) return null;
    storeOnboardingCourseCache(course);
    return course;
  } catch {
    return null;
  }
}