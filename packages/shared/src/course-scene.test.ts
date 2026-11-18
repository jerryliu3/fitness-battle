import { expect, it } from "vitest";
import { distance } from "@turf/turf";
import { courseAthleteDetail, courseInitialZoom, coursePreviewLanes, raceCourseScene } from "./course-scene";
import { createRaceCourse, raceCoursePosition, raceCourseRacerPosition } from "./race-course";

it("gives each real racer a covered trail ending at its dot, without exposing future geometry", () => {
  const course = createRaceCourse("Street", [[0, 0], [.01, 0], [.02, 0]]);
  const lanes = [{ id: "you", name: "You", initials: "Y", you: true, value: .5 }, { id: "peer", name: "Peer", initials: "P", value: 1 }, { id: "ghost", name: "Past you", initials: "Y", ghost: true, value: 10 }];
  const scene = raceCourseScene(course, lanes, "km", "peer", false);
  expect(scene.markers.features).toHaveLength(2);
  expect(scene.selected?.metres).toBe(1000);
  expect(scene.trails.features).toHaveLength(2);
  expect(scene).not.toHaveProperty("route");
  for (const trail of scene.trails.features) {
    expect(trail.geometry.coordinates.at(-1)).toEqual(scene.markers.features.find(f => f.id === trail.id)?.geometry.coordinates);
    expect(trail.geometry.coordinates.every(c => c[0] <= raceCoursePosition(course, 1000).coordinate[0] + .000001)).toBe(true);
  }
  expect(scene.overviewCoordinates[1][0]).toBeLessThan(.01);
  expect(scene.trails.features.find(f => f.id === "peer")?.properties.color).toBe("#f7c948");
  expect(scene.trails.features.find(f => f.id === "you")?.properties.color).toBe("#637482");
  expect(scene.markers.features.map(f => [f.id, f.properties.leader, f.properties.color])).toEqual([["you", false, "#637482"], ["peer", true, "#f7c948"]]);
  expect(raceCourseScene(course, lanes, "pts", "peer").markers.features).toHaveLength(0);
  expect(lanes[0].value).toBe(.5);
});

it("fans shared-lane markers symmetrically at the start line only", () => {
  const course = createRaceCourse("Street", [[0, 0], [.01, 0]]);
  const lanes = [
    { id: "you", name: "You", initials: "Y", you: true, value: 0 },
    { id: "mystery-0", name: "Athlete #1", initials: "?", mystery: true, value: 0 },
    { id: "mystery-1", name: "Athlete #2", initials: "?", mystery: true, value: 0 },
  ];
  const scene = raceCourseScene(course, lanes, "km", "you");
  const coordinates = scene.markers.features.map((marker) => marker.geometry.coordinates);
  expect(new Set(coordinates.map((coordinate) => coordinate.join(","))).size).toBe(3);
  const laterals = scene.callouts.map((lane) => lane.lateralMetres);
  expect(laterals[0] + laterals[1] + laterals[2]).toBeCloseTo(0, 5);
  expect(laterals.every((lateral) => Math.abs(lateral) <= 8)).toBe(true);
  const midRace = raceCourseScene(course, lanes.map((lane) => ({ ...lane, value: .5 })), "km", "you");
  for (const marker of midRace.markers.features) {
    expect(marker.geometry.coordinates).toEqual(raceCoursePosition(course, 500).coordinate);
  }
});

it("draws one centerline trail for the selected racer in shared profile lane mode", () => {
  const course = createRaceCourse("Street", [[0, 0], [.01, 0]]);
  const lanes = Array.from({ length: 10 }, (_, i) => ({ id: `racer-${i}`, name: `Racer ${i}`, initials: "R", you: i === 7, value: .5 }));
  const scene = raceCourseScene(course, lanes, "km", "racer-0");
  expect(scene.markers.features.find(f => f.properties.you)?.geometry.coordinates).toEqual(raceCoursePosition(course, 500).coordinate);
  for (const marker of scene.markers.features) {
    expect(marker.geometry.coordinates).toEqual(raceCoursePosition(course, 500).coordinate);
  }
  expect(scene.trails.features).toHaveLength(1);
  expect(scene.trails.features[0]?.id).toBe("racer-0");
  const racerNine = raceCourseScene(course, lanes, "km", "racer-9");
  expect(racerNine.trails.features).toHaveLength(1);
  expect(racerNine.trails.features[0]?.id).toBe("racer-9");
  const separate = raceCourseScene(course, lanes, "km", "racer-0", false);
  expect(separate.trails.features).toHaveLength(10);
  expect(new Set(separate.markers.features.map((marker) => marker.geometry.coordinates.join(","))).size).toBeGreaterThan(1);
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
      const outbound = raceCourseScene(course, lanes, "km", "b", false);
      const inbound = raceCourseScene(course, lanes.map(l => ({ ...l, value: (2 * course.length - metres) / 1000 })), "km", "b", false);
      for (let i = 0; i < 2; i++) {
        expect(distance(outbound.markers.features[i].geometry.coordinates, inbound.markers.features[i].geometry.coordinates, { units: "meters" })).toBeLessThan(.001);
        expect(outbound.trails.features[i].geometry.coordinates.at(-1)).toEqual(outbound.markers.features[i].geometry.coordinates);
        expect(inbound.trails.features[i].geometry.coordinates.at(-1)).toEqual(inbound.markers.features[i].geometry.coordinates);
      }
      expect(outbound.selected?.coordinate).toEqual(
        outbound.trails.features.find((trail) => trail.id === outbound.selected?.id)?.geometry.coordinates.at(-1),
      );
    }
  }
});

it("labels every real racer independently of selection", () => {
  const course = createRaceCourse("Street", [[0, 0], [.02, 0]]);
  const lanes = [{ id: "you", name: "You", initials: "Y", you: true, value: .5 }, { id: "a", name: "A", initials: "A", value: 1 }, { id: "b", name: "B", initials: "B", value: .4 }, { id: "past", name: "Past", initials: "P", ghost: true, value: 100 }];
  const scene = raceCourseScene(course, lanes, "km", "a");
  expect(scene.callouts.map(lane => lane.id)).toEqual(["you", "a", "b"]);
  expect(courseAthleteDetail(lanes, lanes[0], "km")).toBe("2nd · 0.5 km");
  expect(courseAthleteDetail(lanes, lanes[1], "km")).toBe("1st · 1.0 km");
  expect(courseAthleteDetail(lanes, lanes[2], "km")).toBe("3rd · 0.4 km");
  const reselected = raceCourseScene(course, lanes, "km", "you");
  expect(reselected.callouts.map(lane => lane.id)).toEqual(["you", "a", "b"]);
  expect(reselected.callouts.map(lane => lane.callout)).toEqual(scene.callouts.map(lane => lane.callout));
  expect(new Set(scene.callouts.map(lane => `${lane.callout.left}:${lane.callout.y}`)).size).toBe(3);
});


it("keeps the initial ground span stable across viewport sizes and latitudes", () => {
  const zoom = courseInitialZoom(0, 600, 0);
  expect(78271.516964 / 2 ** zoom * 600).toBeCloseTo(2000);
  expect(courseInitialZoom(0, 1200, 0)).toBeCloseTo(zoom + 1);
  expect(courseInitialZoom(60, 600, 0)).toBeCloseTo(zoom - 1);
  expect(courseInitialZoom(0, 600, 60)).toBeCloseTo(zoom + Math.log2(3));
  expect(courseInitialZoom(0, 0, 60)).toBe(courseInitialZoom(0, 600, 60));
});

it.each(["km", "mi"])("includes reachable preview rivals using competition distance in %s", unit => {
  const metresPerUnit = unit === "mi" ? 1609.344 : 1000;
  const lanes = [
    { id: "you", you: true, metres: 5000 },
    { id: "ahead", metres: 5900 },
    { id: "behind", metres: 4100 },
    { id: "far", metres: 15000 },
    { id: "past", ghost: true, metres: 5000 },
  ].map(lane => ({ ...lane, name: lane.id, initials: "", value: lane.metres / metresPerUnit }));
  expect(coursePreviewLanes(lanes, unit).map(lane => lane.id)).toEqual(["you", "ahead", "behind"]);
  expect(coursePreviewLanes(lanes.filter(lane => !lane.you), unit)).toEqual([]);
  expect(coursePreviewLanes(lanes, "pts")).toEqual([]);
});

it("keeps you in a center start position regardless of ID sorting or selected rival", () => {
  const course = createRaceCourse("Street", [[0, 0], [.01, 0]]);
  for (const count of [3, 8]) {
    const lanes = Array.from({ length: count }, (_, i) => ({ id: i === 0 ? "z-you" : `a-${i}`, name: "Athlete", initials: "A", you: i === 0, value: 0 }));
    const scene = raceCourseScene(course, lanes, "km", "a-1");
    const you = scene.callouts.find(lane => lane.you)!;
    expect(Math.abs(you.lateralMetres)).toBeCloseTo(count % 2 ? 0 : .21);
    expect(new Set(scene.callouts.map(lane => lane.lateralMetres)).size).toBe(count);
  }
});
