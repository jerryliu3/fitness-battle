import { raceCoursePosition, raceCourseTrail, raceEffortMetres, type RaceCourse } from "./race-course";
import type { ArenaSceneLane } from "./arena-view";

/** Geometry only changes with athlete totals or the chosen course, never camera frames. */
export function raceCourseScene(course: RaceCourse, lanes: readonly ArenaSceneLane[], unit: string, selectedId: string) {
  const athletes = lanes.filter(lane => !lane.ghost).map(lane => {
    const metres = raceEffortMetres(lane.value, unit);
    return metres === null ? null : { ...lane, ...raceCoursePosition(course, metres) };
  }).filter(athlete => athlete !== null);
  const selected = athletes.find(lane => lane.id === selectedId) ?? athletes.find(lane => lane.you) ?? athletes[0];
  return {
    selected,
    route: { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: course.coordinates } },
    trail: { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: raceCourseTrail(course, selected?.metres ?? 0) } },
    markers: { type: "FeatureCollection" as const, features: athletes.map(athlete => ({
      type: "Feature" as const, id: athlete.id,
      properties: { id: athlete.id, name: athlete.name, you: Boolean(athlete.you), selected: athlete.id === selected?.id },
      geometry: { type: "Point" as const, coordinates: athlete.coordinate },
    })) },
  };
}
