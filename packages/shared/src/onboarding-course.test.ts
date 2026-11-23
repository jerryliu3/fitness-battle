import { describe, expect, it } from "vitest";
import {
  bundledOnboardingCourse,
  clearOnboardingCourseCache,
  parseRouteSurfaceCourse,
  prefetchOnboardingCourse,
  readOnboardingCourseCache,
  resolveOnboardingCourse,
  storeOnboardingCourseCache,
} from "./onboarding-course";

describe("onboarding course", () => {
  it("falls back to the bundled course when cache is empty", () => {
    clearOnboardingCourseCache();
    storeOnboardingCourseCache(bundledOnboardingCourse());
    expect(resolveOnboardingCourse().name).toBe(bundledOnboardingCourse().name);
    clearOnboardingCourseCache();
    expect(resolveOnboardingCourse()).toEqual(bundledOnboardingCourse());
  });

  it("stores a valid server payload and ignores invalid geometry", async () => {
    await prefetchOnboardingCourse(async () => ({
      name: "Park",
      coordinates: [[0, 0], [0.02, 0]],
    }));
    expect(readOnboardingCourseCache()?.name).toBe("Park");
    await prefetchOnboardingCourse(async () => ({ name: "Bad", coordinates: [[999, 0]] }));
    expect(readOnboardingCourseCache()?.name).toBe("Park");
    expect(parseRouteSurfaceCourse(null)).toBeNull();
  });
});