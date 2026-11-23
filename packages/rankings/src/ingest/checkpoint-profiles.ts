/** Cumulative checkpoint distances (metres) for marathon split tables. */
export type MarathonCheckpointProfile = {
  id: string;
  /** Primary label on MikaTiming detail rows, one per checkpoint. */
  labels: readonly string[];
  /** Aliases accepted in addition to the primary label at the same index. */
  labelAliases: readonly (readonly string[])[];
  distancesM: readonly number[];
};

function profile(
  id: string,
  checkpoints: { label: string; aliases?: string[]; distanceM: number }[],
): MarathonCheckpointProfile {
  return {
    id,
    labels: checkpoints.map((row) => row.label),
    labelAliases: checkpoints.map((row) => [row.label, ...(row.aliases ?? [])]),
    distancesM: checkpoints.map((row) => row.distanceM),
  };
}

const MILE_M = 1609.344;

/** NYRR TCS New York City Marathon mats (miles plus km markers). */
export const MARATHON_NYC = profile("marathon_nyc", [
  { label: "3M", distanceM: 3 * MILE_M },
  { label: "5K", distanceM: 5000 },
  { label: "4M", distanceM: 4 * MILE_M },
  { label: "5M", distanceM: 5 * MILE_M },
  { label: "6M", distanceM: 6 * MILE_M },
  { label: "10K", distanceM: 10_000 },
  { label: "7M", distanceM: 7 * MILE_M },
  { label: "8M", distanceM: 8 * MILE_M },
  { label: "9M", distanceM: 9 * MILE_M },
  { label: "15K", distanceM: 15_000 },
  { label: "10M", distanceM: 10 * MILE_M },
  { label: "11M", distanceM: 11 * MILE_M },
  { label: "12M", distanceM: 12 * MILE_M },
  { label: "20K", distanceM: 20_000 },
  { label: "13M", distanceM: 13 * MILE_M },
  { label: "HALF", aliases: ["Half"], distanceM: 21_097.5 },
  { label: "14M", distanceM: 14 * MILE_M },
  { label: "15M", distanceM: 15 * MILE_M },
  { label: "25K", distanceM: 25_000 },
  { label: "16M", distanceM: 16 * MILE_M },
  { label: "17M", distanceM: 17 * MILE_M },
  { label: "18M", distanceM: 18 * MILE_M },
  { label: "30K", distanceM: 30_000 },
  { label: "19M", distanceM: 19 * MILE_M },
  { label: "20M", distanceM: 20 * MILE_M },
  { label: "21M", distanceM: 21 * MILE_M },
  { label: "35K", distanceM: 35_000 },
  { label: "22M", distanceM: 22 * MILE_M },
  { label: "23M", distanceM: 23 * MILE_M },
  { label: "24M", distanceM: 24 * MILE_M },
  { label: "40K", distanceM: 40_000 },
  { label: "25M", distanceM: 25 * MILE_M },
  { label: "26M", distanceM: 26 * MILE_M },
  { label: "MAR", aliases: ["Finish"], distanceM: 42_195 },
]);

/** Five-kilometre mats through half and finish — Chicago, Berlin, London mass. */
export const MARATHON_KM10 = profile("marathon_km10", [
  { label: "05K", aliases: ["5K", "5 km"], distanceM: 5000 },
  { label: "10K", aliases: ["10 km"], distanceM: 10_000 },
  { label: "15K", aliases: ["15 km"], distanceM: 15_000 },
  { label: "20K", aliases: ["20 km"], distanceM: 20_000 },
  { label: "HALF", aliases: ["Halb"], distanceM: 21_097.5 },
  { label: "25K", aliases: ["25 km"], distanceM: 25_000 },
  { label: "30K", aliases: ["30 km"], distanceM: 30_000 },
  { label: "35K", aliases: ["35 km"], distanceM: 35_000 },
  { label: "40K", aliases: ["40 km"], distanceM: 40_000 },
  { label: "Finish", distanceM: 42_195 },
]);

/** Boston Athletic Association timing mats (km plus mile markers). */
/** San Francisco Marathon — two-mile mats on the ChronoTrack/Athlinks AZP feed. */
export const MARATHON_SF_MILES = profile("marathon_sf_miles", [
  { label: "2 Mile", aliases: ["2 Mile Split"], distanceM: 3219 },
  { label: "4 Mile", aliases: ["4 Mile Split"], distanceM: 6437 },
  { label: "6 Mile", aliases: ["6 Mile Split"], distanceM: 9656 },
  { label: "8 Mile", aliases: ["8 Mile Split"], distanceM: 12_875 },
  { label: "10 Mile", aliases: ["10 Mile Split"], distanceM: 16_093 },
  { label: "12 Mile", aliases: ["12 Mile Split"], distanceM: 19_312 },
  { label: "14 Mile", aliases: ["14 Mile Split"], distanceM: 22_531 },
  { label: "16 Mile", aliases: ["16 Mile Split"], distanceM: 25_750 },
  { label: "18 Mile", aliases: ["18 Mile Split"], distanceM: 28_968 },
  { label: "20 Mile", aliases: ["20 Mile Split"], distanceM: 32_187 },
  { label: "22 Mile", aliases: ["22 Mile Split"], distanceM: 35_406 },
  { label: "24 Mile", aliases: ["24 Mile Split"], distanceM: 38_624 },
  { label: "Finish", aliases: ["Full Course"], distanceM: 42_195 },
]);

export const MARATHON_BOSTON = profile("marathon_boston", [
  { label: "5K", distanceM: 5000 },
  { label: "10K", distanceM: 10_000 },
  { label: "15K", distanceM: 15_000 },
  { label: "20K", distanceM: 20_000 },
  { label: "HALF", distanceM: 21_097.5 },
  { label: "25K", distanceM: 25_000 },
  { label: "30K", distanceM: 30_000 },
  { label: "20 Miles", distanceM: 32_186.9 },
  { label: "21 Miles", distanceM: 33_796.08 },
  { label: "35K", distanceM: 35_000 },
  { label: "23 Miles", distanceM: 37_014.912 },
  { label: "24 Miles", distanceM: 38_624.256 },
  { label: "40K", distanceM: 40_000 },
  { label: "25.2 Miles", distanceM: 40_505.568 },
  { label: "Finish Net", aliases: ["Finish"], distanceM: 42_195 },
]);

export const CHECKPOINT_PROFILES: Record<string, MarathonCheckpointProfile> = {
  marathon_km10: MARATHON_KM10,
  marathon_boston: MARATHON_BOSTON,
  marathon_nyc: MARATHON_NYC,
  marathon_sf_miles: MARATHON_SF_MILES,
};

export function normalizeCheckpointLabel(label: string): string {
  return label.replace(/\s+/g, " ").trim();
}