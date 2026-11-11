import type { RoadDistance } from "../fingerprint";
import { buildFinish, clocksFromText, sexCode } from "./finish";
import type { IngestedFinish } from "./types";
import { readResultPages, type ResultsPage } from "./pagination";

type RunSignupRow = {
  result_id?: number | string;
  bib?: number | string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  clock_time?: string;
  chip_time?: string;
  age?: number | string | null;
};

export type RunSignupSet = {
  individual_result_set_id?: number | string;
  individual_result_set_name?: string;
  public_results?: string;
  preliminary_results?: string;
  results?: RunSignupRow[];
};

export type RunSignupPayload = {
  individual_results_sets?: RunSignupSet[];
};

export type RunSignupPage = ResultsPage & {
  skippedPrivate: number;
  skippedPreliminary: number;
};

/** Require explicitly public, finalized sets; absent flags are not approval. */
export function parseRunSignupResults(
  payload: RunSignupPayload,
  options: { distance: RoadDistance; sourceUrl: string },
): RunSignupPage {
  const results: IngestedFinish[] = [];
  let skippedYouth = 0;
  let skippedUnparsed = 0;
  let skippedPrivate = 0;
  let skippedPreliminary = 0;
  let inputCount = 0;
  const rowKeys: string[] = [];
  if (!Array.isArray(payload?.individual_results_sets)) throw new Error("Invalid RunSignup result sets response.");
  for (const set of payload.individual_results_sets) {
    inputCount += (set.results ?? []).length;
    if (set.public_results !== "T") {
      skippedPrivate += (set.results ?? []).length;
      for (const row of set.results ?? []) {
        rowKeys.push(String(row.result_id ?? `private_${rowKeys.length}`));
      }
      continue;
    }
    if (set.preliminary_results !== "F") {
      skippedPreliminary += (set.results ?? []).length;
      for (const row of set.results ?? []) {
        rowKeys.push(String(row.result_id ?? `preliminary_${rowKeys.length}`));
      }
      continue;
    }
    if (!Array.isArray(set.results)) throw new Error("Missing RunSignup results array.");
    for (const row of set.results) {
      if (row.result_id == null || String(row.result_id).trim() === "") {
        throw new Error("Missing RunSignup result ID; import held.");
      }
      rowKeys.push(String(row.result_id));
      const ageYears = row.age == null || row.age === "" ? null : Number(row.age);
      if (ageYears != null && Number.isFinite(ageYears) && ageYears < 18) {
        skippedYouth += 1;
        continue;
      }
      const clocks = clocksFromText(row.chip_time || null, row.clock_time || null);
      if ("skip" in clocks) {
        skippedUnparsed += 1;
        continue;
      }
      const built = buildFinish({
        externalResultId: String(row.result_id),
        athleteName: [row.first_name, row.last_name].filter(Boolean).join(" "),
        bib: row.bib == null ? null : String(row.bib),
        sex: sexCode(row.gender),
        distance: options.distance,
        ageYears: ageYears != null && Number.isFinite(ageYears) ? ageYears : null,
        chipTimeMs: clocks.chipTimeMs,
        gunTimeMs: clocks.gunTimeMs,
        finishStatus: clocks.finishStatus,
        sourceUrl: options.sourceUrl,
      });
      if ("skip" in built) {
        if (built.skip === "youth") skippedYouth += 1;
        else skippedUnparsed += 1;
        continue;
      }
      results.push(built.finish);
    }
  }
  return { results, inputCount, rowKeys, skippedYouth, skippedUnparsed, skippedPrivate, skippedPreliminary, isExhausted: inputCount === 0 };
}

export function runSignupResultSetsUrl(raceId: string, eventId: string): string {
  if (!/^\d+$/.test(raceId) || !/^\d+$/.test(eventId)) throw new Error("RunSignup race and event IDs must be numeric.");
  const url = new URL(`https://api.runsignup.com/rest/race/${raceId}/results/get-result-sets`);
  url.searchParams.set("format", "json");
  url.searchParams.set("event_id", eventId);
  url.searchParams.set("supports_nb", "T");
  return url.toString();
}

export function runSignupResultsUrl(raceId: string, eventId: string, page: number, pageSize: number, resultSetId: string): string {
  if (!/^\d+$/.test(resultSetId)) throw new Error("RunSignup result set ID must be numeric.");
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error("RunSignup page and page size must be positive integers.");
  }
  const url = new URL(runSignupResultSetsUrl(raceId, eventId).replace("get-result-sets", "get-results"));
  url.searchParams.set("individual_result_set_id", resultSetId);
  url.searchParams.set("page", String(page));
  url.searchParams.set("results_per_page", String(pageSize));
  return url.toString();
}

/** Fetch one selected set so overlapping overall/division lists are never combined. */
export async function fetchRunSignupResults(options: {
  raceId: string;
  eventId: string;
  resultSetId: string;
  distance: RoadDistance;
  fetchJson: (url: string) => Promise<RunSignupPayload>;
  pageSize?: number;
  maxPages?: number;
}): Promise<RunSignupPage[]> {
  const { raceId, eventId, resultSetId, distance, fetchJson } = options;
  // Validate all IDs before any request.
  runSignupResultsUrl(raceId, eventId, 1, options.pageSize ?? 100, resultSetId);
  const metadata = await fetchJson(runSignupResultSetsUrl(raceId, eventId));
  const selected = metadata?.individual_results_sets?.filter((set) => String(set.individual_result_set_id) === resultSetId);
  if (selected?.length !== 1 || selected[0].public_results !== "T" || selected[0].preliminary_results !== "F") {
    throw new Error("Select an explicitly public, finalized RunSignup result set.");
  }
  return readResultPages(async (page) => {
    const url = runSignupResultsUrl(raceId, eventId, page, options.pageSize ?? 100, resultSetId);
    const payload = await fetchJson(url);
    const sets = payload?.individual_results_sets;
    if (!Array.isArray(sets) || sets.length !== 1 || String(sets[0].individual_result_set_id) !== resultSetId) {
      throw new Error("RunSignup returned an unexpected result set; import held.");
    }
    if (sets[0].public_results !== "T" || sets[0].preliminary_results !== "F") {
      throw new Error("RunSignup result set is no longer public and finalized; import held.");
    }
    return parseRunSignupResults(payload, { distance, sourceUrl: url });
  }, options.maxPages);
}
