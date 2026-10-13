import type { RoadDistance } from "../fingerprint";
import { buildFinish, clocksFromText, sexCode } from "./finish";
import { divisionIsUnder18 } from "./names";
import type { IngestedFinish } from "./types";

export type CsvPage = {
  results: IngestedFinish[];
  skippedYouth: number;
  skippedUnparsed: number;
};

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function headerIndex(headers: string[], names: string[]): number {
  return headers.findIndex((header) => names.includes(header));
}

/** A full results file forwarded as CSV. The distance argument covers files that omit it. */
export function parseResultsCsv(
  text: string,
  options: { distance: RoadDistance; sourceUrl: string },
): CsvPage {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return { results: [], skippedYouth: 0, skippedUnparsed: 0 };
  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());
  const first = headerIndex(headers, ["first", "first_name", "firstname"]);
  const last = headerIndex(headers, ["last", "last_name", "lastname"]);
  const name = headerIndex(headers, ["name", "athlete", "athlete_name", "full_name"]);
  const bib = headerIndex(headers, ["bib", "bib_number"]);
  const sex = headerIndex(headers, ["sex", "gender"]);
  const chip = headerIndex(headers, ["chip", "chip_time", "net", "net_time"]);
  const gun = headerIndex(headers, ["gun", "gun_time", "time", "finish", "finish_time", "official_time"]);
  const age = headerIndex(headers, ["age", "age_years"]);
  const division = headerIndex(headers, ["division", "age_group"]);
  const id = headerIndex(headers, ["id", "result_id", "external_id"]);
  const results: IngestedFinish[] = [];
  let skippedYouth = 0;
  let skippedUnparsed = 0;

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const athleteName =
      name >= 0
        ? cells[name] ?? ""
        : [cells[first] ?? "", cells[last] ?? ""].filter(Boolean).join(" ");
    const ageYears = age >= 0 && cells[age] ? Number(cells[age]) : null;
    const divisionText = division >= 0 ? cells[division] : null;
    if (
      (ageYears != null && Number.isFinite(ageYears) && ageYears < 18) ||
      divisionIsUnder18(divisionText)
    ) {
      skippedYouth += 1;
      continue;
    }
    const clocks = clocksFromText(
      chip >= 0 ? cells[chip] || null : null,
      gun >= 0 ? cells[gun] || null : null,
    );
    if ("skip" in clocks) {
      skippedUnparsed += 1;
      continue;
    }
    const built = buildFinish({
      externalResultId: id >= 0 && cells[id] ? cells[id] : null,
      athleteName,
      bib: bib >= 0 ? cells[bib] || null : null,
      sex: sexCode(sex >= 0 ? cells[sex] : null),
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
  return { results, skippedYouth, skippedUnparsed };
}
