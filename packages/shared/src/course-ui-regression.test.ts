import { expect, it, vi } from "vitest";
import { coursePositionLeaders } from "./course-scene";
import { competitionReplayDimension, nextCompetitionReplaySpeed } from "./competition-replay";
import { createCourseCamera, createRaceCourse } from "./race-course";
import { syncReviewMetrics } from "./sync-review-metrics";
import type { Activity } from "./compete/sports";

it("normalizes every replay entry point for points fields and preserves requested map views", () => {
  expect(competitionReplayDimension("strength")).toBe("2d");
  expect(competitionReplayDimension("strength", "4d")).toBe("2d");
  expect(competitionReplayDimension("running")).toBe("4d");
  expect(competitionReplayDimension("cycling", "2d")).toBe("2d");
});
it("cycles all replay speeds through slow motion and back to normal", () => {
  let speed = 1;
  const sequence = Array.from({ length: 5 }, () => speed = nextCompetitionReplaySpeed(speed));
  expect(sequence).toEqual([2, 4, .25, .5, 1]);
});
it("shows top three plus you without duplicating a top-three viewer", () => {
  const ranked = Array.from({ length: 8 }, (_, i) => ({ id: String(i), you: i === 6 }));
  expect(coursePositionLeaders(ranked).map(row => row.id)).toEqual(["0", "1", "2", "6"]);
  expect(coursePositionLeaders(ranked.map((row, i) => ({ ...row, you: i === 1 }))).map(row => row.id)).toEqual(["0", "1", "2"]);
});
it("initializes a flat camera without a flight and distinguishes Fixed from native gestures", () => {
  const move = vi.fn(), stop = vi.fn();
  const controller = createCourseCamera({ read: () => ({ center: [0, 0], zoom: 16, pitch: 0, bearing: 0 }), move, stop }, false, "2d");
  expect(move).not.toHaveBeenCalled();
  const course = createRaceCourse("Street", [[0, 0], [.01, 0]]);
  controller.focus(course, 0);
  expect(move.mock.lastCall![0].pitch).toBe(0);
  controller.interrupt();
  expect(stop).toHaveBeenLastCalledWith(true);
  controller.interrupt(false);
  expect(stop).toHaveBeenLastCalledWith(false);
  move.mockClear();
  controller.focus(course, 100, true);
  expect(move).not.toHaveBeenCalled();
  controller.dimension("3d", false);
  expect(move).not.toHaveBeenCalled();
  controller.focus(course, 100);
  expect(move).toHaveBeenCalledOnce();
  expect(move.mock.lastCall![0].pitch).toBe(60);
});
const activity = (id: string, startedAt: string, distanceM = 5000): Activity => ({ id, startedAt, distanceM, movingSec: 1800, avgHr: 140, elevationGainM: 100, sport: "running", source: "strava", verified: true });
it("compares earlier sync-batch sessions once and omits future, other-sport, and excluded history", () => {
  const current = activity("current", "2026-10-31T14:00:00Z");
  const prior = activity("prior", "2026-10-30T14:00:00Z", 10000);
  const history = [current, prior, prior, activity("later", "2026-11-01T14:00:00Z", 100000), { ...activity("excluded", "2026-10-29T14:00:00Z", 100000), disposition: "excluded" as const }, { ...activity("cycling", "2026-10-28T14:00:00Z", 100000), sport: "cycling" as const }];
  expect(syncReviewMetrics(current, history, "metric").find(metric => metric.id === "distance")?.fraction).toBe(.5);
  expect(syncReviewMetrics(current, [], "metric").every(metric => metric.fraction === null)).toBe(true);
  expect(syncReviewMetrics(current, history, "us").find(metric => metric.id === "elevation")?.valueLabel).toBe("328 ft");
});
