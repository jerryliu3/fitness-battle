import { expect, it } from "vitest";
import { distance } from "@turf/turf";
import { raceCourseScene } from "./course-scene";
import { createRaceCourse, raceCoursePosition, raceCourseRacerPosition } from "./race-course";

it("gives each real racer a covered trail ending at its dot, without exposing future geometry", () => {
  const course = createRaceCourse("Street", [[0, 0], [.01, 0], [.02, 0]]);
  const lanes = [{ id: "you", name: "You", initials: "Y", you: true, value: .5 }, { id: "peer", name: "Peer", initials: "P", value: 1 }, { id: "ghost", name: "Past you", initials: "Y", ghost: true, value: 10 }];
  const scene = raceCourseScene(course, lanes, "km", "peer");
  expect(scene.markers.features).toHaveLength(2);
  expect(scene.selected?.metres).toBe(1000);
  expect(scene.trails.features).toHaveLength(2);
  expect(scene).not.toHaveProperty("route");
  for (const trail of scene.trails.features) {
    expect(trail.geometry.coordinates.at(-1)).toEqual(scene.markers.features.find(f => f.id === trail.id)?.geometry.coordinates);
    expect(trail.geometry.coordinates.every(c => c[0] <= raceCoursePosition(course, 1000).coordinate[0] + .000001)).toBe(true);
  }
  expect(scene.overviewCoordinates[1][0]).toBeLessThan(.01);
  expect(scene.trails.features.find(f => f.id === "you")?.properties.color).toBe("#f7c948");
  expect(raceCourseScene(course, lanes, "pts", "peer").markers.features).toHaveLength(0);
  expect(lanes[0].value).toBe(.5);
});

it("centers the viewer on the road and fits ten stable individual lanes across 3.15 metres", () => {
  const course = createRaceCourse("Street", [[0, 0], [.01, 0]]);
  const lanes = Array.from({ length: 10 }, (_, i) => ({ id: `racer-${i}`, name: `Racer ${i}`, initials: "R", you: i === 7, value: .5 }));
  const scene = raceCourseScene(course, lanes, "km", "racer-0");
  expect(scene.markers.features.find(f => f.properties.you)?.geometry.coordinates).toEqual(raceCoursePosition(course, 500).coordinate);
  const markers = [...scene.markers.features].sort((a, b) => a.geometry.coordinates[1] - b.geometry.coordinates[1]);
  for (let i = 1; i < markers.length; i++) expect(distance(markers[i - 1].geometry.coordinates, markers[i].geometry.coordinates, { units: "meters" })).toBeCloseTo(.35, 3);
  expect(distance(markers[0].geometry.coordinates, markers.at(-1)!.geometry.coordinates, { units: "meters" })).toBeCloseTo(3.15, 3);
  expect(scene.trails.features).toHaveLength(10);
  const selected = raceCourseScene(course, lanes, "km", "racer-9");
  expect(selected.trails).toBe(scene.trails);
  const reordered = raceCourseScene(course, [...lanes].reverse(), "km", "racer-9");
  for (const marker of markers) expect(reordered.markers.features.find(f => f.id === marker.id)?.geometry.coordinates).toEqual(marker.geometry.coordinates);
  const together = raceCourseScene(course, lanes, "km", "racer-0", 0);
  for (const marker of together.markers.features) expect(marker.geometry.coordinates).toEqual(raceCoursePosition(course, 500).coordinate);
});

it("reveals no trail for zero activity and bounds overview to the known start", () => {
  const course = createRaceCourse("Street", [[0, 0], [.01, 0]]);
  const scene = raceCourseScene(course, [{ id: "you", name: "You", initials: "Y", you: true, value: 0 }], "km", "you");
  expect(scene.trails.features).toHaveLength(0);
  expect(scene.overviewCoordinates).toEqual([[0, 0], [0, 0]]);
});

it("keeps full earned trails ending at returning dots, with geometry bounded across unlimited trips", () => {
  const course = createRaceCourse("Corner", [[0, 0], [.01, 0], [.01, .01]]);
  for (const trip of [.25, 1, 1.25, 2, 2.25, 20_000.25]) {
    const scene = raceCourseScene(course, [{ id: "you", name: "You", initials: "Y", you: true, value: course.length * trip / 1000 }], "km", "you");
    const trail = scene.trails.features[0].geometry.coordinates;
    expect(trail.at(-1)).toEqual(scene.selected?.coordinate);
    expect(trail.length).toBeLessThanOrEqual(2 * course.coordinates.length + 1);
    if (trip >= 1) {
      expect(trail).toContainEqual(course.coordinates[0]);
      expect(trail).toContainEqual(course.coordinates.at(-1));
    }
  }
});

it("keeps each racer's trail aligned through bends, turnarounds, and the date line", () => {
  for (const course of [createRaceCourse("Corner", [[0, 0], [.01, 0], [.01, .01]]), createRaceCourse("Date line", [[179.99, 0], [-179.99, .01]])]) {
    for (const metres of [course.metres[1] - 1, course.metres[1], course.length * .3, course.length]) {
      const lanes = [{ id: "a", name: "A", initials: "A", you: true, value: metres / 1000 }, { id: "b", name: "B", initials: "B", value: metres / 1000 }];
      const outbound = raceCourseScene(course, lanes, "km", "b");
      const inbound = raceCourseScene(course, lanes.map(l => ({ ...l, value: (2 * course.length - metres) / 1000 })), "km", "b");
      for (let i = 0; i < 2; i++) {
        expect(distance(outbound.markers.features[i].geometry.coordinates, inbound.markers.features[i].geometry.coordinates, { units: "meters" })).toBeLessThan(.001);
        expect(outbound.trails.features[i].geometry.coordinates.at(-1)).toEqual(outbound.markers.features[i].geometry.coordinates);
        expect(inbound.trails.features[i].geometry.coordinates.at(-1)).toEqual(inbound.markers.features[i].geometry.coordinates);
      }
      expect(outbound.selected?.coordinate).toEqual(raceCourseRacerPosition(course, metres, -.35).coordinate);
    }
  }
});
