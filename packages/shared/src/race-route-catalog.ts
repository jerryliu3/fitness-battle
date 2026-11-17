/** Matches `competition_route` / server assignment: active catalog rows ordered by id. */
export function raceRouteCatalogIndex(periodStartIso: string, activeRouteCount: number) {
  if (activeRouteCount < 1) return null;
  return Math.floor(Date.parse(periodStartIso) / 604_800_000) % activeRouteCount;
}

export function pickRaceRouteIdByRotation(periodStartIso: string, activeRouteIds: readonly string[]) {
  if (!activeRouteIds.length) return null;
  const index = raceRouteCatalogIndex(periodStartIso, activeRouteIds.length)!;
  return activeRouteIds[index] ?? null;
}