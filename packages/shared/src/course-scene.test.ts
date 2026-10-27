import { expect, it } from "vitest";
import { raceCourseScene } from "./course-scene";
import { distance } from "@turf/turf";
import { createRaceCourse, raceCoursePosition } from "./race-course";
it("uses current real totals and excludes ghosts and points without changing scores", () => {
  const course = createRaceCourse("Street", [[0, 0], [.01, 0], [.02, 0]]);
  const lanes = [{ id: "you", name: "You", initials: "Y", you: true, value: .5 }, { id: "peer", name: "Peer", initials: "P", value: 1 }, { id: "ghost", name: "Past you", initials: "Y", ghost: true, value: 10 }];
  const scene = raceCourseScene(course, lanes, "km", "peer");
  expect(scene.markers.features).toHaveLength(2);
  expect(scene.selected?.metres).toBe(1000);
  expect(scene.trails.features).toHaveLength(2);
  expect(scene.trails.features.at(-1)?.id).toBe("peer");
  expect(scene.trails.features[0].properties.color).toBe("#f7c948");
  expect(scene.trail.geometry.coordinates.at(-1)).toEqual(raceCoursePosition(course, 1000).coordinate);
  expect(scene.markers.features.find(f => f.properties.id === "peer")?.properties.selected).toBe(true);
  expect(raceCourseScene(course, lanes, "pts", "peer").markers.features).toHaveLength(0);
  expect(lanes[0].value).toBe(.5);
});

it("keeps total distance and the full covered trail when a selected athlete returns", () => {
  const course = createRaceCourse("Street", [[0, 0], [.01, 0]]);
  const value = course.length * 1.5 / 1000;
  const scene = raceCourseScene(course, [{ id: "you", name: "You", initials: "Y", you: true, value }], "km", "you");
  expect(scene.selected?.metres).toBeCloseTo(value * 1000);
  expect(scene.selected?.returning).toBe(true);
  expect(scene.selected?.coordinate[0]).toBeCloseTo(.005);
  expect(scene.trails.features[0].geometry.coordinates).toEqual(course.coordinates);
});

it("spaces ten tied racers by two metres without changing order, totals, or shared trail geometry", () => {
  const course = createRaceCourse("Street", [[0, 0], [.01, 0]]);
  const lanes = Array.from({ length: 10 }, (_, i) => ({ id: `racer-${i}`, name: `Racer ${i}`, initials: "R", value: .5 }));
  const scene = raceCourseScene(course, lanes, "km", "racer-0");
  const markers = scene.markers.features;
  for (let i = 1; i < markers.length; i++) expect(distance(markers[i - 1].geometry.coordinates, markers[i].geometry.coordinates, { units: "meters" })).toBeCloseTo(2, 3);
  const reordered = raceCourseScene(course, [...lanes].reverse(), "km", "racer-9");
  for (const marker of markers) expect(reordered.markers.features.find(f => f.id === marker.id)?.geometry.coordinates).toEqual(marker.geometry.coordinates);
  expect(scene.selected?.metres).toBe(500);
  expect(scene.trails.features).toHaveLength(2);
  const together = raceCourseScene(course, lanes, "km", "racer-0", 0);
  for (const marker of together.markers.features) expect(marker.geometry.coordinates).toEqual(raceCoursePosition(course, 500).coordinate);
});
it("keeps a racer's road side on the return leg and through a course bend", () => {
  const course = createRaceCourse("Corner", [[0, 0], [.01, 0], [.01, .01]]);
  const lanes = [{ id: "a", name: "A", initials: "A", value: 0 }, { id: "b", name: "B", initials: "B", value: 0 }];
  for (const metres of [course.metres[1] - 1, course.metres[1], course.length]) {
    const outbound = raceCourseScene(course, lanes.map(l => ({ ...l, value: metres / 1000 })), "km", "a");
    const inbound = raceCourseScene(course, lanes.map(l => ({ ...l, value: (2 * course.length - metres) / 1000 })), "km", "a");
    for (let i = 0; i < 2; i++) {
      expect(distance(outbound.markers.features[i].geometry.coordinates, inbound.markers.features[i].geometry.coordinates, { units: "meters" })).toBeLessThan(.001);
      expect(distance(outbound.markers.features[i].geometry.coordinates, raceCoursePosition(course, metres).coordinate, { units: "meters" })).toBeCloseTo(1, 3);
    }
  }
});
