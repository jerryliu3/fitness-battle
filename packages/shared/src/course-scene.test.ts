import { expect, it } from "vitest";
import { raceCourseScene } from "./course-scene";
import { createRaceCourse } from "./race-course";
it("uses current real totals and excludes ghosts and points without changing scores", () => {
  const course = createRaceCourse("Street", [[0, 0], [.01, 0], [.02, 0]]);
  const lanes = [{ id: "you", name: "You", initials: "Y", you: true, value: .5 }, { id: "peer", name: "Peer", initials: "P", value: 1 }, { id: "ghost", name: "Past you", initials: "Y", ghost: true, value: 10 }];
  const scene = raceCourseScene(course, lanes, "km", "peer");
  expect(scene.markers.features).toHaveLength(2);
  expect(scene.selected?.metres).toBe(1000);
  expect(scene.trail.geometry.coordinates.at(-1)).toEqual(scene.selected?.coordinate);
  expect(scene.markers.features.find(f => f.properties.id === "peer")?.properties.selected).toBe(true);
  expect(raceCourseScene(course, lanes, "pts", "peer").markers.features).toHaveLength(0);
  expect(lanes[0].value).toBe(.5);
});
