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
export const RACE_CATEGORY_FILTERS = [{value:"all",label:"All runners"},...RACE_CATEGORIES] as const;
export const RACE_PERCENTILE_FILTERS = [
  { value: "all", label: "All percentiles" },
  { value: "top50", label: "Top 50% (faster than median)" },
  { value: "top25", label: "Top 25% (faster than 75%)" },
  { value: "top10", label: "Top 10% (faster than 90%)" },
  { value: "top5", label: "Top 5% (faster than 95%)" },
  { value: "top1", label: "Top 1% (faster than 99%)" },
] as const;
export type RaceResult = {
  id: number; athlete_name: string; sex: string; distance_slug: string;
  rank_time_ms: number; rank_clock: "chip" | "gun"; age_years: number | null;
  result_date: string | null; event_name: string; edition_year: number;
  attribution: string; source_url: string; bib: string | null; place: number;
  percentile?: number | null;
  cohort_total?: number | null;
};
export type RaceResultsPage = {
  rows: RaceResult[]; total: number; cohortTotal: number; page: number; pageSize: number;
  analytics?: RaceEditionAnalytics | null;
  windowFrom?: string | null; windowUntil?: string | null;
};
export const RACE_TIMEFRAMES = [
  {value:"all",label:"All time"}, {value:"year",label:"Edition year"},
  {value:"12m",label:"Past 12 months"}, {value:"custom",label:"Custom dates"},
] as const;
function validRaceDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "1900-01-01" && value <= "2100-12-31"
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
export function raceDateError(from: string, through: string): string | null {
  if (!validRaceDate(from) || !validRaceDate(through)) return "Enter valid dates from 1900 to 2100.";
  return from > through ? "The end date must be on or after the start date." : null;
}
export function raceQuery(input: { get(name: string): string | null }) {
  const sex = input.get("sex") ?? "all";
  const edition = input.get("edition") ?? "";
  const editionId = /^[1-9]\d*$/.test(edition) && Number.isSafeInteger(Number(edition)) ? Number(edition) : null;
  const year = Number(input.get("year"));
  const page = Number(input.get("page"));
  const percentile = input.get("percentile") ?? "all";
  const validYear = Number.isInteger(year) && year >= 1900 && year <= 2100;
  const timeframe = RACE_TIMEFRAMES.find(t => t.value === input.get("timeframe"))?.value ?? (validYear ? "year" : "all");
  const from = (input.get("from") ?? "").trim();
  const through = (input.get("through") ?? "").trim();
  return {
    editionId,
    editionError: edition && !editionId ? "Choose a valid event edition." : null,
    sex: RACE_CATEGORY_FILTERS.some(c => c.value === sex) ? sex : "all",
    percentile: RACE_PERCENTILE_FILTERS.some(p => p.value === percentile) ? percentile : "all",
    year: timeframe === "year" && validYear ? year : null,
    timeframe, from: timeframe === "custom" ? from : "", through: timeframe === "custom" ? through : "",
    dateError: timeframe === "custom" ? raceDateError(from,through) : timeframe === "year" && !validYear ? "Enter an edition year from 1900 to 2100." : null,
    query: (input.get("q") ?? "").trim().slice(0, 100),
    page: Number.isSafeInteger(page) && page > 0 && page <= 2147483647 ? page : 1,
  };
}
export function raceClock(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const rest = String(seconds % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}
export type RaceBenchmarks = {
  top1Ms?: number | null;
  top5Ms?: number | null;
  top10Ms?: number | null;
  top25Ms?: number | null;
  medianMs: number;
};
export type RaceResultReport = {
  athleteId?: number | null;
  splits?: import("./race-splits").RaceTimingSplits | null;
  coverage?: RaceCoverage | null;
  result: Omit<RaceResult, "place"> & { event_edition_id: number };
  total: number; place: number; slower: number; medianMs: number;
  percentile?: number | null;
  benchmarks?: RaceBenchmarks | null;
  minimumMs: number; binWidthMs: number;
  bins: { bucket: number; count: number }[];
  neighbors: Pick<RaceResult, "id" | "athlete_name" | "rank_time_ms">[];
};
export function raceSourceUrl(value: string) {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
export type SavedRaceResult = Pick<RaceResult, "id" | "athlete_name" | "distance_slug" | "rank_time_ms" | "rank_clock" | "event_name" | "edition_year">;

/** Descriptive comparisons only: no identity, course adjustment or equivalent times. */
export function compareRaceResults(first: SavedRaceResult, second: SavedRaceResult) {
  const reason = first.id === second.id ? "Choose two different results."
    : first.distance_slug !== second.distance_slug ? "Finish-time gaps require the same race distance."
    : first.rank_clock !== second.rank_clock ? "Finish-time gaps require the same clock type."
    : null;
  return { reason, deltaMs: reason ? null : second.rank_time_ms - first.rank_time_ms };
}

export function raceTimeGap(ms: number) {
  const value = Math.abs(ms);
  const fraction = String(Math.trunc(value % 1000)).padStart(3, "0").replace(/0+$/, "");
  return raceClock(value) + (fraction ? `.${fraction}` : "");
}
export type RaceCoverage = {
  edition_id: number; event_name: string; edition_year: number;
  distance_slug: string; sex: string; published_count: number; undated_count: number;
  expected_eligible_count: number | null; reviewed_at: string | null;
  evidence_url: string | null; complete: boolean;
};
export function raceFasterThan(report: RaceResultReport): number | null {
  if (report.percentile != null && Number.isFinite(report.percentile)) return report.percentile;
  return report.coverage?.complete && report.coverage.published_count === report.total && report.total > 0
    ? (report.slower / report.total) * 100
    : null;
}

export function racePercentileTier(percentile: number): { label: string; topLabel: string } | null {
  if (percentile >= 99) return { label: "Top 1%", topLabel: "Top 1% finisher" };
  if (percentile >= 95) return { label: "Top 5%", topLabel: "Top 5% finisher" };
  if (percentile >= 90) return { label: "Top 10%", topLabel: "Top 10% finisher" };
  if (percentile >= 75) return { label: "Top 25%", topLabel: "Top 25% finisher" };
  if (percentile >= 50) return { label: "Top 50%", topLabel: "Top 50% finisher" };
  return null;
}

/** Race dates are calendar dates. Rolling boundaries use the server UTC date. */
export function raceDateBounds(query: ReturnType<typeof raceQuery>, now = new Date()) {
  if (query.dateError) throw new Error(query.dateError);
  if (query.timeframe === "custom") {
    const until = new Date(query.through); until.setUTCDate(until.getUTCDate()+1);
    return {from:query.from,until:until.toISOString().slice(0,10)};
  }
  if (query.timeframe === "12m") {
    const year=now.getUTCFullYear()-1, month=now.getUTCMonth();
    const day=Math.min(now.getUTCDate(),new Date(Date.UTC(year,month+1,0)).getUTCDate());
    const until=new Date(Date.UTC(now.getUTCFullYear(),month,now.getUTCDate()+1));
    return {from:new Date(Date.UTC(year,month,day)).toISOString().slice(0,10),until:until.toISOString().slice(0,10)};
  }
  return {from:null,until:null};
}

export function raceWindowCaption(page: RaceResultsPage) {
  if (!page.windowFrom || !page.windowUntil) return "";
  const through = new Date(page.windowUntil); through.setUTCDate(through.getUTCDate()-1);
  return `Event dates: ${page.windowFrom} – ${through.toISOString().slice(0,10)}`;
}

export function racePercentLabel(value: number) {
  if (value > 0 && value < 0.1) return "<0.1%";
  if (value > 99.9 && value < 100) return ">99.9%";
  return `${value.toFixed(1)}%`;
}

/** Public inventory only; categories share a single edition selector entry. */
export function raceEditionOptions(coverage: RaceCoverage[], distance: string) {
  const editions = new Map<number, Pick<RaceCoverage, "edition_id" | "event_name" | "edition_year">>();
  for (const row of coverage) {
    if (row.distance_slug === distance) editions.set(row.edition_id, {edition_id:row.edition_id,event_name:row.event_name,edition_year:row.edition_year});
  }
  return [...editions.values()].sort((a, b) => b.edition_year - a.edition_year || a.event_name.localeCompare(b.event_name) || a.edition_id - b.edition_id);
}

export type RaceEditionAnalytics = {
  editionCount?: number;
  total: number; fastestMs: number; slowestMs: number; medianMs: number;
  minimumMs: number; binWidthMs: number; chipCount: number; officialCount: number;
  bins: {bucket: number; count: number}[];
  benchmarks?: RaceBenchmarks | null;
};

/** Renderers share bin boundaries and empty gaps; never derive counts from a page. */
export function raceEditionChart(analytics: RaceEditionAnalytics) {
  const counts = new Map(analytics.bins.map(b => [b.bucket,b.count]));
  const peak = Math.max(...analytics.bins.map(b => b.count),1);
  return Array.from({length:Math.max(...analytics.bins.map(b => b.bucket),0)+1}, (_,bucket) => {
    const from = analytics.minimumMs+bucket*analytics.binWidthMs;
    const count = counts.get(bucket) ?? 0;
    return {bucket,count,height:count/peak*100,label:`${raceClock(from)} – under ${raceClock(from+analytics.binWidthMs)}`};
  });
}

/** Edition cards combine stored categories; category selection remains a filter. */
export function raceEventGroups(coverage:RaceCoverage[],sex="all") {
  const groups=new Map<string,{edition_id:number;event_name:string;edition_year:number;distance_slug:string;published_count:number;undated_count:number;categoryCount:number;reviewedCount:number;evidenceUrls:string[]}>();
  for(const row of coverage) {
    if(sex!=="all" && row.sex!==sex) continue;
    const key=`${row.edition_id}:${row.distance_slug}`;
    const group=groups.get(key) ?? {edition_id:row.edition_id,event_name:row.event_name,edition_year:row.edition_year,distance_slug:row.distance_slug,published_count:0,undated_count:0,categoryCount:0,reviewedCount:0,evidenceUrls:[]};
    group.published_count+=row.published_count;group.undated_count+=row.undated_count;group.categoryCount++;group.reviewedCount+=Number(row.complete);
    const url=row.evidence_url ? raceSourceUrl(row.evidence_url) : null;
    if(url && !group.evidenceUrls.includes(url)) group.evidenceUrls.push(url);
    groups.set(key,group);
  }
  return [...groups.values()].sort((a,b)=>b.edition_year-a.edition_year || a.event_name.localeCompare(b.event_name));
}
