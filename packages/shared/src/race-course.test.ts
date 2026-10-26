import { describe, expect, it, vi } from "vitest";
import { createRaceCourse, raceCourseFromGpx, raceCoursePosition, raceCourseTrail, raceEffortMetres, createCourseCamera, type CourseCameraPose } from "./race-course";
const course = createRaceCourse("City", [[0, 0], [.001, 0], [.001, .002]]);
describe("race courses", () => {
  it("indexes distance, removes duplicates and clamps both ends without laps", () => {
    const duplicate = createRaceCourse("City", [[0, 0], [0, 0], [.001, 0]]);
    expect(duplicate.metres).toHaveLength(2);
    expect(raceCoursePosition(course, -20).coordinate).toEqual([0, 0]);
    expect(raceCoursePosition(course, course.metres[1]).coordinate[0]).toBeCloseTo(.001);
    expect(raceCoursePosition(course, course.length + 999).coordinate).toEqual([.001, .002]);
    expect(raceCoursePosition(course, course.length).finished).toBe(true);
    expect(raceCourseTrail(course, 200)).toHaveLength(3);
    expect(raceEffortMetres(1, "mi")).toBe(1609.344);
    expect(raceEffortMetres(10, "pts")).toBeNull();
  });
  it("supports GPX routes and tracks without activity timestamps", () => {
    for (const [container, point] of [["trkseg", "trkpt"], ["rte", "rtept"]]) {
      expect(raceCourseFromGpx(`<gpx><${container}><${point} lon='0' lat='0'/><${point} lat="0" lon=".001"/></${container}></gpx>`).length).toBeGreaterThan(100);
    }
  });
  it("rejects disconnected segments, invalid coordinates, entities and oversized input", () => {
    for (const input of ["<gpx><trkseg></trkseg><trkseg></trkseg></gpx>", "<!DOCTYPE gpx><gpx/>", "x".repeat(4 * 1024 * 1024 + 1), '<gpx><rte><rtept lat="NaN" lon="0"/></rte></gpx>']) expect(() => raceCourseFromGpx(input)).toThrow();
    expect(() => createRaceCourse("Bad", [[0, 0], [181, 0]])).toThrow();
  });
  it("takes the short route across the antimeridian", () => {
    const dateLine = createRaceCourse("Date line", [[179.99, 0], [-179.99, 0]]);
    expect(dateLine.length).toBeLessThan(2300);
    expect(Math.abs(raceCoursePosition(dateLine, dateLine.length / 2).coordinate[0])).toBeCloseTo(180);
  });
  it("lets direct manipulation cancel following and explicit focus resume it", () => {
    let pose: CourseCameraPose = { center: [0, 0], zoom: 16, pitch: 60, bearing: 0 };
    const stop = vi.fn(), move = vi.fn((next: CourseCameraPose) => { pose = next; });
    const camera = createCourseCamera({ read: () => pose, stop, move });
    camera.focus(course, 100); expect(camera.following).toBe(true);
    camera.interrupt(); move.mockClear(); camera.focus(course, 200, true); expect(move).not.toHaveBeenCalled();
    camera.focus(course, 200); expect(move).toHaveBeenCalledTimes(1);
    camera.dimension("2d"); expect(pose.pitch).toBe(0); expect(pose.bearing).toBe(0);
    camera.zoom(50); expect(pose.zoom).toBe(20); expect(camera.following).toBe(false);
    expect(stop).toHaveBeenCalled();
  });
  it("honors reduced motion for every camera command", () => {
    const move = vi.fn(); const camera = createCourseCamera({ read: () => ({ center: [0, 0], zoom: 16, pitch: 0, bearing: 0 }), stop() {}, move }, true);
    camera.focus(course, 200); camera.dimension("3d"); camera.zoom(1); camera.overview(course);
    expect(move.mock.calls.every(call => call[1] === 0)).toBe(true);
  });
});
