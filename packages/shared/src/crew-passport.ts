import { crewSessionInstant } from "./compete/crew-sessions";
import { formatDistanceM, distanceUnitLabel } from "./compete/engine";
import type { UnitSystem } from "./compete/sports";

export type CrewContractMetric = "distance_m" | "moving_sec" | "sessions" | "contributors";
export interface CrewContract {
  id: string; crew_id: string; season_id: string | null; title: string; sport: string;
  metric: CrewContractMetric; target: number; value: number; contributors: number; roster_size: number;
  period_kind: "daily" | "weekly" | "monthly" | "custom";
  time_zone: string; starts_at: string; ends_at: string; rule_version: number;
}
export interface CrewSeason {
  id: string; crew_id: string; title: string; starts_at: string; ends_at: string; time_zone: string;
}
export interface CrewPassportStamp {
  id: string; crew_id: string; season_id: string; contract_id: string; code: string; earned_at: string; rule_version: number;
}
export interface CrewPassport {
  contract: CrewContract | null; seasons: CrewSeason[]; stamps: CrewPassportStamp[];
}
export type CrewPassportMutation =
  | { action: "contract"; crewId: string; title: string; metric: CrewContractMetric; target: number; expectedId: string | null }
  | { action: "season"; crewId: string; title: string; startsAt: string; endsAt: string };
export const CREW_CONTRACT_METRICS: { id: CrewContractMetric; label: string }[] = [
  { id: "distance_m", label: "Distance (km)" }, { id: "moving_sec", label: "Time (hours)" },
  { id: "sessions", label: "Sessions" }, { id: "contributors", label: "Teammates" },
];
export function crewContractMetrics(sport: string) {
  return CREW_CONTRACT_METRICS.filter(metric => sport !== "strength" || metric.id !== "distance_m");
}
export function crewContractTarget(metric: CrewContractMetric, input: string): number {
  const value = Number(input);
  const target = metric === "distance_m" ? value * 1000 : metric === "moving_sec" ? value * 3600 : value;
  if (!Number.isFinite(target) || target <= 0 || ((metric === "sessions" || metric === "contributors") && !Number.isInteger(target)))
    throw Error("Enter a positive target.");
  return target;
}
export function crewContractValue(metric: CrewContractMetric, value: number, units?: UnitSystem): string {
  if (metric === "distance_m") return `${formatDistanceM(value, units)} ${distanceUnitLabel(units)}`;
  if (metric === "moving_sec") return `${Number((value / 3600).toFixed(1))} h`;
  return `${value} ${metric === "sessions" ? "sessions" : "teammates"}`;
}
export function crewSeasonBounds(start: string, end: string) {
  const startsAt = crewSessionInstant(start, "00:00"), endsAt = crewSessionInstant(end, "00:00");
  if (Date.parse(endsAt) <= Date.parse(startsAt)) throw Error("The end date must follow the start date.");
  return { startsAt, endsAt };
}
export function crewPassportError(code: string) {
  if (code.includes("not_a_member")) return "Your crew membership has changed. Refresh your crews.";
  if (code.includes("contract_changed")) return "A teammate changed the contract. Review it and try again.";
  if (code.includes("season_overlap")) return "These dates overlap another crew season.";
  if (code.includes("invalid_season")) return "Choose a name and valid season dates.";
  if (code.includes("invalid_contract")) return "Choose a name and a positive target within your crew’s size.";
  return "Could not update your crew. Try again.";
}
export function crewStampLabel(code: string): string {
  return ({ contract_finish: "Shared finish", full_crew: "Full crew" } as Record<string, string>)[code] ?? code.replaceAll("_", " ");
}

export function crewSeasonProgress(season: CrewSeason, now: string): number {
  const start = Date.parse(season.starts_at), end = Date.parse(season.ends_at);
  return Math.max(0, Math.min(100, (Date.parse(now) - start) / (end - start) * 100));
}
