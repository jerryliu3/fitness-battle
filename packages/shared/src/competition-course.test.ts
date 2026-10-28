import { expect, it } from "vitest";
import { raceCourseFromAssignment } from "./competition-course";

it("accepts only valid geometry for the requested competition window", () => {
  const start = "2026-10-26T04:00:00Z", end = "2026-11-02T05:00:00Z";
  expect(raceCourseFromAssignment({ name: "Park", coordinates: [[0, 0], [.02, 0]], periodStart: start, periodEnd: end }, start, end).name).toBe("Park");
  expect(() => raceCourseFromAssignment({ name: "Park", coordinates: [[0, 0], [.02, 0]], periodStart: start, periodEnd: end }, "2026-10-19T04:00:00Z", end)).toThrow();
  expect(() => raceCourseFromAssignment({ name: "Park", coordinates: [[0, 0], [999, 0]], periodStart: start, periodEnd: end }, start, end)).toThrow();
});
