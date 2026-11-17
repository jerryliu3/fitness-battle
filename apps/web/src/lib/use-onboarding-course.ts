"use client";
import { resolveOnboardingCourse, type RaceCourse } from "@fitness-battle/shared";

/** Synchronous course for onboarding overtake; never blocks on network. */
export function useOnboardingCourse(): RaceCourse {
  return resolveOnboardingCourse();
}

import { prefetchOnboardingCourse } from "@fitness-battle/shared";

export function prefetchOnboardingCourseFromApi() {
  void fetch("/api/routes/onboarding-course", { cache: "force-cache" })
    .then(response => (response.ok ? response.json() : Promise.reject()))
    .then(body => prefetchOnboardingCourse(async () => body))
    .catch(() => undefined);
}