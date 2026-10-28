import { expect, it } from "vitest";
import { WEEKLY_RACE_COURSES, raceCourseFromAssignment, weeklyRaceCourse } from "./weekly-race-course";

it("assigns one library course to every athlete throughout an Eastern week", () => {
  const monday = weeklyRaceCourse(new Date("2026-10-26T04:00:00Z"));
  expect(WEEKLY_RACE_COURSES.map(route => route.course)).toContain(monday);
  expect(weeklyRaceCourse(new Date("2026-10-28T12:00:00Z"))).toBe(monday);
  expect(weeklyRaceCourse(new Date("2026-11-02T04:59:59Z"))).toBe(monday);
  expect(weeklyRaceCourse(new Date("2026-11-02T05:00:00Z"))).not.toBe(monday);
});

it("accepts only valid geometry for the requested competition window", () => {
  const start = "2026-10-26T04:00:00Z", end = "2026-11-02T05:00:00Z";
  expect(raceCourseFromAssignment({ name: "Park", coordinates: [[0, 0], [.02, 0]], periodStart: start, periodEnd: end }, start, end).name).toBe("Park");
  expect(() => raceCourseFromAssignment({ name: "Park", coordinates: [[0, 0], [.02, 0]], periodStart: start, periodEnd: end }, "2026-10-19T04:00:00Z", end)).toThrow();
  expect(() => raceCourseFromAssignment({ name: "Park", coordinates: [[0, 0], [999, 0]], periodStart: start, periodEnd: end }, start, end)).toThrow();
});

it("rotates through the whole library without changing historical assignments", () => {
  const weeks = ["2026-10-26", "2026-11-02", "2026-11-09"].map(day => weeklyRaceCourse(new Date(`${day}T12:00:00Z`)));
  expect(new Set(weeks).size).toBe(WEEKLY_RACE_COURSES.length);
  expect(weeklyRaceCourse(new Date("2026-10-26T12:00:00Z"))).toBe(weeks[0]);
});
