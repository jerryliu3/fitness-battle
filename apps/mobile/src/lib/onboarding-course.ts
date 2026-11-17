import {
  ONBOARDING_OVERTAKE_SURFACE_ID,
  prefetchOnboardingCourse,
  resolveOnboardingCourse,
  type RaceCourse,
} from "@fitness-battle/shared";

export function readOnboardingCourse(): RaceCourse {
  return resolveOnboardingCourse();
}

export async function prefetchOnboardingCourseFromApi(accessToken?: string) {
  const { mobileEnv } = await import("./env");
  const url = `${mobileEnv.apiUrl.replace(/\/$/, "")}/api/routes/onboarding-course`;
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    return prefetchOnboardingCourse(async () => response.json());
  } catch {
    return null;
  }
}

export { ONBOARDING_OVERTAKE_SURFACE_ID };