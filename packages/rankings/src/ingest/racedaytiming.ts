import type { RoadDistance, SexCategory } from "../fingerprint";
import { buildFinish, clocksFromText, sexCode } from "./finish";
import { decodeHtml, divisionIsUnder18, personNameFromList } from "./names";
import type { ResultsPage } from "./pagination";
import type { IngestedFinish } from "./types";

const ROW_MARKER = /<tr\b/i;
const VIEW_LINK = /\/view\/(\d+)"/i;
const TIME_CELL = /<td class="align-top text-end">\s*(\d{1,2}:\d{2}:\d{2})\s*<\/td>/i;
const BIB_CELL = /<td class="text-end align-top">(\d+)\s*<\/td>/i;
const DIVISION_LINK = /\/division\/([A-Za-z0-9-]+)"/i;

function sexFromDivision(division: string | null): SexCategory {
  if (!division) return "unknown";
  const lead = division.trim().charAt(0).toUpperCase();
  if (lead === "M") return sexCode("M");
  if (lead === "F") return sexCode("F");
  if (lead === "X") return sexCode("X");
  return "unknown";
}

export function racedayTimingListUrl(baseUrl: string, path: string, page: number): string {
  const root = baseUrl.replace(/\/$/, "");
  const relative = path.replace(/^\//, "");
  if (page <= 1) return `${root}/en/races/${relative}`;
  return `${root}/en/races/${relative}/page/${page}`;
}

/** Startline / Race Day Timing public HTML results tables. */
export function parseRaceDayTimingList(
  html: string,
  options: {
    distance: RoadDistance;
    sourceUrl: string;
  },
): ResultsPage {
  const results: IngestedFinish[] = [];
  let skippedYouth = 0;
  let skippedUnparsed = 0;
  const rowKeys: string[] = [];
  const pieces = html.split(ROW_MARKER).slice(1);
  for (const fragment of pieces) {
    const row = `<tr${fragment}`;
    const viewMatch = VIEW_LINK.exec(row);
    if (!viewMatch) continue;
    const externalResultId = viewMatch[1]!;
    rowKeys.push(externalResultId);
    const division = DIVISION_LINK.exec(row)?.[1] ?? null;
    if (divisionIsUnder18(division)) {
      skippedYouth += 1;
      continue;
    }
    const timeMatch = TIME_CELL.exec(row);
    const clocks = clocksFromText(timeMatch?.[1] ?? null, null);
    if ("skip" in clocks) {
      skippedUnparsed += 1;
      continue;
    }
    const nameMatch = /<a href="[^"]*\/view\/\d+">\s*([^<]+)/i.exec(row);
    const athleteName = nameMatch ? personNameFromList(decodeHtml(nameMatch[1])) : "";
    const bib = BIB_CELL.exec(row)?.[1] ?? null;
    const built = buildFinish({
      externalResultId,
      athleteName,
      bib,
      sex: sexFromDivision(division),
      distance: options.distance,
      ageYears: null,
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
  if (rowKeys.length === 0) {
    return { results: [], inputCount: 0, rowKeys: [], skippedYouth: 0, skippedUnparsed: 0, isExhausted: true };
  }
  return { results, inputCount: rowKeys.length, rowKeys, skippedYouth, skippedUnparsed, isExhausted: false };
}