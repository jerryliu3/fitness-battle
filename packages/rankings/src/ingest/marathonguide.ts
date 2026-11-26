import { buildFinish, clocksFromText, sexCode } from "./finish";
import type { IngestedFinish } from "./types";
import type { RoadDistance } from "../fingerprint";

const RESULTS_PATH =
  /^\/races\/run\/(?<slug>[^/]+)\/(?<year>\d{4})\/results\/?$/i;

export function parseMarathonGuideResultsUrl(url: string): { raceSlug: string; year: number } {
  let pathname = url.trim();
  try {
    pathname = new URL(url).pathname;
  } catch {
  }
  const match = RESULTS_PATH.exec(pathname);
  if (!match?.groups?.slug || !match.groups.year) {
    throw new Error(`Not a MarathonGuide results URL: ${url}`);
  }
  return { raceSlug: match.groups.slug, year: Number(match.groups.year) };
}

export function marathonGuideFinishersApiUrl(raceSlug: string, year: number, page: number): string {
  const params = new URLSearchParams({ page: String(page), per_page: "100" });
  return `https://www.marathonguide.com/api/v1/races/${encodeURIComponent(raceSlug)}/${year}/finishers?${params}`;
}

type JsonRecord = Record<string, unknown>;

function firstString(row: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstNumber(row: JsonRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  }
  return null;
}

function finisherRows(payload: unknown): JsonRecord[] {
  if (Array.isArray(payload)) return payload as JsonRecord[];
  if (payload && typeof payload === "object") {
    const object = payload as JsonRecord;
    for (const key of ["finishers", "data", "results", "rows", "items"]) {
      const value = object[key];
      if (Array.isArray(value)) return value as JsonRecord[];
    }
  }
  throw new Error("MarathonGuide finishers payload missing a row array.");
}

export function parseMarathonGuideFinishersPage(
  payload: unknown,
  options: { distance: RoadDistance; sourceUrl: string },
): { results: IngestedFinish[]; skippedYouth: number; skippedUnparsed: number } {
  const results: IngestedFinish[] = [];
  let skippedYouth = 0;
  let skippedUnparsed = 0;

  for (const row of finisherRows(payload)) {
    const name =
      firstString(row, ["runner_name", "name", "athleteName", "runnerName", "full_name"]) ?? "";
    const bib = firstString(row, ["bib_number", "bib", "bibNumber"]);
    const sexRaw = firstString(row, ["gender", "sex"]);
    const age = firstNumber(row, ["age", "ageYears"]);
    const chip = firstString(row, ["chip_time", "chipTime", "net_time", "finish_time", "time"]);
    const gun = firstString(row, ["gun_time", "gunTime"]);
    const place = firstNumber(row, ["overall_place", "place", "overallPlace", "rank"]);
    const externalId =
      firstString(row, ["id", "result_id", "external_id"]) ??
      (bib ? `bib:${bib}` : place != null ? `place:${place}` : null);

    const clocks = clocksFromText(chip, gun);
    if ("skip" in clocks) {
      skippedUnparsed += 1;
      continue;
    }
    const built = buildFinish({
      externalResultId: externalId,
      athleteName: name,
      bib,
      sex: sexCode(sexRaw),
      distance: options.distance,
      ageYears: age,
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

  return { results, skippedYouth, skippedUnparsed };
}