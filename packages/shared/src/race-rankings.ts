/** Public race observations, independent of weekly competition and modeled pace. */
export const RACE_DISTANCES = [
  { slug: "5k", stored: "5k", label: "5K" },
  { slug: "10k", stored: "10k", label: "10K" },
  { slug: "half-marathon", stored: "half_marathon", label: "Half marathon" },
  { slug: "marathon", stored: "marathon", label: "Marathon" },
] as const;
export const RACE_CATEGORIES = [
  { value: "female", label: "Women" }, { value: "male", label: "Men" },
  { value: "other", label: "Other categories" }, { value: "unknown", label: "Unspecified" },
] as const;
export type RaceResult = {
  id: number; athlete_name: string; sex: string; distance_slug: string;
  rank_time_ms: number; rank_clock: "chip" | "gun"; age_years: number | null;
  result_date: string | null; event_name: string; edition_year: number;
  attribution: string; source_url: string; bib: string | null; place: number;
};
export type RaceResultsPage = {
  rows: RaceResult[]; total: number; cohortTotal: number; page: number; pageSize: number;
};
export function raceQuery(input: { get(name: string): string | null }) {
  const sex = input.get("sex") ?? "female";
  const year = Number(input.get("year"));
  const page = Number(input.get("page"));
  return {
    sex: RACE_CATEGORIES.some(c => c.value === sex) ? sex : "female",
    year: Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : null,
    query: (input.get("q") ?? "").trim().slice(0, 100),
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}
export function raceClock(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const rest = String(seconds % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}
export type RaceResultReport = {
  result: Omit<RaceResult, "place">;
  total: number; place: number; slower: number; medianMs: number;
  minimumMs: number; binWidthMs: number;
  bins: { bucket: number; count: number }[];
  neighbors: Pick<RaceResult, "id" | "athlete_name" | "rank_time_ms">[];
};
export function raceSourceUrl(value: string) {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
