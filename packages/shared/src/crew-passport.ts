import { crewSessionInstant } from "./compete/crew-sessions";
import { formatDistanceM, distanceUnitLabel } from "./compete/engine";
import { SPORTS, type SportId, type UnitSystem } from "./compete/sports";

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
  contract: CrewContract | null; seasons: CrewSeason[]; stamps: CrewPassportStamp[]; badges?: CrewBadgeReceipt[];
}
export type CrewPassportMutation =
  | { action: "contract"; crewId: string; title: string; metric: CrewContractMetric; target: number; expectedId: string | null }
  | { action: "season"; crewId: string; title: string; startsAt: string; endsAt: string };
export const CREW_CONTRACT_METRICS: { id: CrewContractMetric; label: string }[] = [
  { id: "distance_m", label: "Distance (km)" }, { id: "moving_sec", label: "Time (hours)" },
  { id: "sessions", label: "Sessions" }, { id: "contributors", label: "Teammates" },
];
export interface CrewTargetSelectorSpec {
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  presets: readonly number[];
  unit: string;
}

export function crewTargetSpec(kind: "shared_distance_km" | "session_targets" | "duration_hours" | CrewContractMetric): CrewTargetSelectorSpec {
  switch (kind) {
    case "shared_distance_km":
    case "distance_m":
      return { min: 1, max: 500, step: 5, defaultValue: 40, presets: [20, 40, 60, 100, 150], unit: "km" };
    case "session_targets":
      return { min: 1, max: 14, step: 1, defaultValue: 3, presets: [2, 3, 4, 5, 7], unit: "sessions" };
    case "duration_hours":
    case "moving_sec":
      return { min: 1, max: 200, step: 1, defaultValue: 10, presets: [5, 10, 20, 40], unit: "h" };
    case "sessions":
      return { min: 1, max: 50, step: 1, defaultValue: 10, presets: [5, 10, 15, 25], unit: "sessions" };
    case "contributors":
      return { min: 1, max: 50, step: 1, defaultValue: 3, presets: [2, 3, 5, 8], unit: "teammates" };
  }
}

export function formatCrewTargetLabel(value: number, unit?: string): string {
  if (!unit) return String(value);
  if (value === 1 && unit === "sessions") return "1 session";
  if (value === 1 && unit === "teammates") return "1 teammate";
  return `${value} ${unit}`;
}

export function crewContractMetrics(sport: string) {
  return CREW_CONTRACT_METRICS.filter(metric => (sport !== "strength" && sport !== "all") || metric.id !== "distance_m");
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

export const CREW_BADGES = [
  { code: "first_week", name: "First week together", icon: "calendar", seal: { fill: "#cce1e9", edge: "#a1c3d3", ink: "#173d54", radius: 10 }, requirement: "Two teammates contribute in one week." },
  { code: "full_crew", name: "Full crew", icon: "crew", seal: { fill: "#c9decf", edge: "#a6cbb4", ink: "#224c3f", radius: 15 }, requirement: "Everyone on a crew of at least two contributes in one week." },
  { code: "contract_finish", name: "Shared finish", icon: "trophy", seal: { fill: "#f7c948", edge: "#ffe59a", ink: "#142b3b", radius: 23 }, requirement: "Reach a Weekly Contract target." },
  { code: "three_week_streak", name: "Three-week streak", icon: "special", seal: { fill: "#edcab1", edge: "#dcab86", ink: "#613a27", radius: 12 }, requirement: "At least two teammates contribute each week for three weeks in a row." },
] as const;

export interface CrewBadgeReceipt {
  code: typeof CREW_BADGES[number]["code"];
  earned_at: string;
  contributors: number;
  roster_size: number;
  metric?: CrewContractMetric | null;
  value?: number | null;
  target?: number | null;
}

export function crewBadgeCollection(receipts: readonly CrewBadgeReceipt[], units?: UnitSystem) {
  return CREW_BADGES.map(badge => {
    const receipt = receipts.find(item => item.code === badge.code);
    let result: string | undefined;
    if (receipt) {
      if (badge.code === "contract_finish" && receipt.metric && receipt.value != null && receipt.target != null)
        result = `${crewContractValue(receipt.metric, receipt.value, units)} of ${crewContractValue(receipt.metric, receipt.target, units)}`;
      else if (badge.code === "full_crew") result = `${receipt.contributors} of ${receipt.roster_size} contributed`;
      else if (badge.code === "first_week") result = `${receipt.contributors} teammates contributed`;
      else if (badge.code === "three_week_streak") result = "3 consecutive weeks";
    }
    return { ...badge, receipt, result };
  });
}

export type CrewSportOption = "all" | SportId;
export type CrewFormatOption = "duration" | "cooperative" | "personal_target";

export const CREW_SPORT_OPTIONS: readonly { id: CrewSportOption; name: string }[] = [
  { id: "all", name: "All" },
  ...SPORTS,
];

export function crewWeeklyMeasureOptions(sport: CrewSportOption): readonly { id: CrewFormatOption; label: string }[] {
  return [
    { id: "duration", label: "Duration (hours)" },
    ...(sport !== "all" && sport !== "strength"
      ? [{ id: "cooperative" as const, label: "Shared distance" }]
      : []),
    { id: "personal_target", label: "Session targets" },
  ];
}

export function resolveEditableCrewSettings(crew: {
  sport: string;
  format: string;
  target_sessions: number;
  journey_km: number;
  target_hours?: number;
}) {
  const sport: CrewSportOption =
    crew.sport === "all" || SPORTS.some((s) => s.id === crew.sport)
      ? (crew.sport as CrewSportOption)
      : "all";
  const format: CrewFormatOption =
    crew.format === "duration"
      ? "duration"
      : crew.format === "personal_target" || sport === "strength" || sport === "all"
        ? "personal_target"
        : "cooperative";
  const target =
    format === "duration"
      ? (crew.target_hours ?? 10)
      : format === "personal_target"
        ? crew.target_sessions
        : crew.journey_km;
  return { sport, format, target };
}

export function crewSettingsTargetConfig(sport: CrewSportOption, format: CrewFormatOption) {
  const effectiveFormat: CrewFormatOption =
    format === "cooperative" && (sport === "all" || sport === "strength")
      ? "personal_target"
      : format;
  const spec = crewTargetSpec(
    effectiveFormat === "duration"
      ? "duration_hours"
      : effectiveFormat === "personal_target"
        ? "session_targets"
        : "shared_distance_km",
  );
  const label =
    effectiveFormat === "duration"
      ? "Default shared hours"
      : effectiveFormat === "personal_target"
        ? "Default sessions per member"
        : "Default shared distance (km)";
  return { effectiveFormat, spec, label };
}
