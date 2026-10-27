import { raceCourseRacerPosition, raceCourseTrail, raceEffortMetres, type RaceCourse } from "./race-course";
import type { ArenaSceneLane } from "./arena-view";

/** Geometry only changes with athlete totals or the chosen course, never camera frames. */
export function raceCourseScene(course: RaceCourse, lanes: readonly ArenaSceneLane[], unit: string, selectedId: string, spacingMetres = 2) {
  const roster = lanes.filter(lane => !lane.ghost);
  // IDs keep lane placement stable when live totals reorder the standings.
  const ids = roster.map(lane => lane.id).sort();
  const offsets = new Map(ids.map((id, index) => [id, (index - (ids.length - 1) / 2) * spacingMetres]));
  const athletes = roster.map(lane => {
    const metres = raceEffortMetres(lane.value, unit);
    return metres === null ? null : { ...lane, ...raceCourseRacerPosition(course, metres, offsets.get(lane.id)) };
  }).filter(athlete => athlete !== null);
  const selected = athletes.find(lane => lane.id === selectedId) ?? athletes.find(lane => lane.you) ?? athletes[0];
  // All athletes share one path. The furthest other peer represents the union
  // of their overlapping cyan trails; retain you and selected on top. At most
  // three prefixes are sent to the renderer, regardless of roster size.
  const peer = athletes.filter(lane => !lane.you && lane.id !== selected?.id).reduce<(typeof athletes)[number] | undefined>((best, lane) => !best || lane.metres > best.metres ? lane : best, undefined);
  const you = athletes.find(lane => lane.you && lane.id !== selected?.id);
  const trails = [peer, you, selected].filter(lane => lane !== undefined).map((athlete, priority) => ({
    type: "Feature" as const, id: athlete.id,
    properties: { color: athlete.you ? "#f7c948" : "#20b9c6", priority },
    geometry: { type: "LineString" as const, coordinates: raceCourseTrail(course, athlete.metres) },
  }));
  return {
    selected,
    trails: { type: "FeatureCollection" as const, features: trails },
    route: { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: course.coordinates } },
    trail: { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: raceCourseTrail(course, selected?.metres ?? 0) } },
    markers: { type: "FeatureCollection" as const, features: athletes.map(athlete => ({
      type: "Feature" as const, id: athlete.id,
      properties: { id: athlete.id, name: athlete.name, you: Boolean(athlete.you), selected: athlete.id === selected?.id },
      geometry: { type: "Point" as const, coordinates: athlete.coordinate },
    })) },
  };
}
