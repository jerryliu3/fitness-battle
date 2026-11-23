const WEEK_MS = 604_800_000;

export const MARATHON_RACE_ROUTE_PREFIX = "marathon-";

/** Same weekly index as `competition_route` / `registeredCompetitionCourse`. */
export function weeklyRaceRouteIndex(epochMs: number, catalogLength: number): number {
  if (catalogLength <= 0) return 0;
  return Math.floor(epochMs / WEEK_MS) % catalogLength;
}

export function isMarathonRaceRouteId(routeId: string): boolean {
  return routeId.startsWith(MARATHON_RACE_ROUTE_PREFIX);
}