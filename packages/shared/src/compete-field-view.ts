import type { FieldViewDimension } from "./compete-time-series";
import { sportById, type CompeteState, type SportId } from "./compete/sports";

export type CompeteArenaEvent = SportId | "sleep";

export type CompetePresentationKind = "geographic" | "metric";

export function competePresentationKind(event: CompeteArenaEvent): CompetePresentationKind {
  if (event === "sleep") return "metric";
  return sportById(event).gps ? "geographic" : "metric";
}

export function isGeographicCompete(event: CompeteArenaEvent): boolean {
  return competePresentationKind(event) === "geographic";
}

export function isMetricCompete(event: CompeteArenaEvent): boolean {
  return !isGeographicCompete(event);
}

export function defaultCompeteFieldView(event: CompeteArenaEvent): FieldViewDimension {
  return isGeographicCompete(event) ? "4d" : "graph";
}

export function allowedCompeteFieldViews(event: CompeteArenaEvent): FieldViewDimension[] {
  return isGeographicCompete(event) ? ["4d", "2d", "graph"] : ["graph", "2d"];
}

export function competeFieldViewLabel(view: FieldViewDimension): string {
  if (view === "4d") return "3D";
  if (view === "graph") return "Chart";
  if (view === "2d") return "2D";
  return "2D";
}

export function competeChartUnit(
  sport: SportId,
  units: CompeteState["units"],
): string {
  if (sportById(sport).gps) return units === "metric" ? "km" : "mi";
  if (sport === "walking") return "steps";
  if (sport === "strength") return "hrs";
  return "hrs";
}

export function competeChartLiveValue(
  sport: SportId,
  row: { distanceM: number; movingSec: number; effort: number },
  units: CompeteState["units"],
): number {
  const spec = sportById(sport);
  const divisor = units === "metric" ? 1000 : 1609.344;
  if (spec.gps) return row.distanceM / divisor;
  if (sport === "walking") return row.effort;
  return row.movingSec / 3600;
}

export function normalizeCompeteFieldView(
  event: CompeteArenaEvent,
  requested: FieldViewDimension,
): FieldViewDimension {
  const allowed = new Set(allowedCompeteFieldViews(event));
  if (allowed.has(requested)) return requested;
  if (requested === "3d") return "2d";
  if (requested === "4d" && !allowed.has("4d")) return defaultCompeteFieldView(event);
  return defaultCompeteFieldView(event);
}