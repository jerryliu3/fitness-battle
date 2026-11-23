import { createRaceCourse, type RaceCourse } from "./race-course";
import fixture from "../fixtures/marathon-race-routes.json";
import { weeklyRaceRouteIndex } from "./race-route-rotation";

export type MarathonRaceRouteRecord = {
  id: string;
  name: string;
  location: string;
  coordinates: [number, number][];
  sourceSlug: string;
  editionYear: number;
};

export const MARATHON_RACE_ROUTE_CATALOG = fixture.routes as readonly MarathonRaceRouteRecord[];

const sortedCatalog = [...MARATHON_RACE_ROUTE_CATALOG].sort((a, b) => a.id.localeCompare(b.id));

export function marathonRaceRouteAt(epochMs: number = Date.now()): MarathonRaceRouteRecord {
  return sortedCatalog[weeklyRaceRouteIndex(epochMs, sortedCatalog.length)]!;
}

export function bundledMarathonRaceCourse(epochMs: number = Date.now()): RaceCourse {
  const route = marathonRaceRouteAt(epochMs);
  return createRaceCourse(route.name, route.coordinates);
}