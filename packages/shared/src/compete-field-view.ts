import type { FieldViewDimension } from "./compete-time-series";
import { sportById, type CompeteState, type SportId } from "./compete/sports";

export type CompeteArenaEvent = SportId | "sleep";

export function isGeographicCompete(event: CompeteArenaEvent): boolean {
  return event !== "sleep" && sportById(event).gps;
}

export function isMetricCompete(event: CompeteArenaEvent): boolean {
  return !isGeographicCompete(event);
}

export function defaultCompeteFieldView(event: CompeteArenaEvent): FieldViewDimension {
  return isGeographicCompete(event) ? "4d" : "graph";
}

export function allowedCompeteFieldViews(event: CompeteArenaEvent): FieldViewDimension[] {
  if (event === "sleep") return ["graph"];
  return isGeographicCompete(event) ? ["4d", "2d", "graph"] : ["graph", "2d"];
}

export function competeFieldViewLabel(view: FieldViewDimension): string {
  if (view === "4d") return "3D";
  if (view === "graph") return "Timeline";
  return "2D";
}

export function competeFieldSwitcherOptions(event: CompeteArenaEvent) {
  return allowedCompeteFieldViews(event).map(value => ({ value, label: competeFieldViewLabel(value) }));
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
  const view = requested === "3d" ? "2d" : requested;
  if (allowedCompeteFieldViews(event).includes(view)) return view;
  return defaultCompeteFieldView(event);
}

/** Lane and replay presentation units (not compete field view dimensions). */
export function isGeographicArenaUnit(unit: string): boolean {
  return unit === "km" || unit === "mi";
}

export function isMetricArenaUnit(unit: string): boolean {
  return !isGeographicArenaUnit(unit);
}

/** Legacy persisted baselines may still read `pts`; treat like hours lanes. */
export function isHoursLikeArenaUnit(unit: string): boolean {
  return unit === "hrs" || unit === "pts";
}

export function fieldZoomLimits(unit: string): { min: number; max: number } {
  if (unit === "steps") return { min: 500, max: 40_000 };
  if (unit === "hrs" || unit === "pts") return { min: 2, max: 100 };
  return { min: 0.5, max: 40 };
}

export function arenaValueDecimals(unit: string): number {
  if (unit === "steps") return 0;
  if (unit === "hrs" || unit === "pts") return 1;
  return 2;
}

export function arenaStandingsQuantityLabel(unit: string): "distance" | "volume" {
  return unit === "km" || unit === "mi" ? "distance" : "volume";
}
