import type { SportId, UnitSystem } from "./compete/sports";
import { formatDistanceM, distanceUnitLabel } from "./compete/engine";
export interface CrewDerby {
  field_id: string; sport: SportId; wave_start: string; week_end: string;
  teams: { crew_id: string; name: string; score: number; place: number }[];
}
export function crewDerbyScore(sport: SportId, value: number, units?: UnitSystem): string {
  return sport === "strength" ? `${Number(value.toFixed(1))} pts` : `${formatDistanceM(value, units)} ${distanceUnitLabel(units)}`;
}
export function crewDerbyOpponent(derby: CrewDerby, crewId: string) {
  const index = derby.teams.findIndex(team => team.crew_id === crewId);
  if (index < 0) return undefined;
  return derby.teams[index === 0 ? 1 : Math.max(0, index - 1)];
}
