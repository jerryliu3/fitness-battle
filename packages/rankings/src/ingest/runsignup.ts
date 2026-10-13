import type { RoadDistance } from "../fingerprint";
import { buildFinish, clocksFromText, sexCode } from "./finish";
import type { IngestedFinish } from "./types";

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

type RunSignupSet = {
  public_results?: string;
  results?: RunSignupRow[];
};

export type RunSignupPayload = {
  individual_results_sets?: RunSignupSet[];
};

export type RunSignupPage = {
  results: IngestedFinish[];
  skippedYouth: number;
  skippedUnparsed: number;
  skippedPrivate: number;
};

/** Public RunSignup results JSON. Sets marked public_results=F are left out. */
export function parseRunSignupResults(
  payload: RunSignupPayload,
  options: { distance: RoadDistance; sourceUrl: string },
): RunSignupPage {
  const results: IngestedFinish[] = [];
  let skippedYouth = 0;
  let skippedUnparsed = 0;
  let skippedPrivate = 0;
  for (const set of payload.individual_results_sets ?? []) {
    if (set.public_results === "F") {
      skippedPrivate += (set.results ?? []).length;
      continue;
    }
    for (const row of set.results ?? []) {
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
        externalResultId: row.result_id == null ? null : String(row.result_id),
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
  return { results, skippedYouth, skippedUnparsed, skippedPrivate };
}

export function runSignupResultsUrl(raceId: string, eventId: string, page: number, pageSize: number): string {
  const url = new URL(`https://runsignup.com/Rest/race/${raceId}/results/get-results`);
  url.searchParams.set("format", "json");
  url.searchParams.set("event_id", eventId);
  url.searchParams.set("page", String(page));
  url.searchParams.set("results_per_page", String(pageSize));
  return url.toString();
}
