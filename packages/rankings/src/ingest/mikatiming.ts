import type { RoadDistance, SexCategory } from "../fingerprint";
import { buildFinish, clocksFromText, sexCode } from "./finish";
import { divisionIsUnder18, personNameFromList } from "./names";
import type { IngestedFinish } from "./types";

export type MikaPage = {
  results: IngestedFinish[];
  skippedYouth: number;
  skippedUnparsed: number;
};

const ROW_SPLIT = /<li class="[^"]*list-group-item row/;

function labeledFields(row: string): Map<string, string> {
  const fields = new Map<string, string>();
  for (const match of row.matchAll(/list-label">([^<]+)<\/div>\s*([^<]+)/gi)) {
    const label = match[1].trim();
    const value = match[2].trim();
    if (label && value && !fields.has(label)) fields.set(label, value);
  }
  return fields;
}

/** One public MikaTiming results list page. Sex comes from the filtered request. */
export function parseMikaTimingList(
  html: string,
  options: {
    sex: SexCategory | string;
    distance: RoadDistance;
    sourceUrl: string;
  },
): MikaPage {
  const sex = typeof options.sex === "string" ? sexCode(options.sex) : options.sex;
  const results: IngestedFinish[] = [];
  let skippedYouth = 0;
  let skippedUnparsed = 0;
  const pieces = html.split(ROW_SPLIT).slice(1);
  for (const row of pieces) {
    if (row.includes("list-group-header")) continue;
    const fields = labeledFields(row);
    const division = fields.get("Division") ?? null;
    if (divisionIsUnder18(division)) {
      skippedYouth += 1;
      continue;
    }
    const nameMatch = /type-fullname">\s*<a [^>]*>([^<]+)<\/a>/i.exec(row);
    const athleteName = nameMatch ? personNameFromList(nameMatch[1]) : "";
    const idMatch = /(?:\?|&|&amp;)idp=([A-Za-z0-9]+)/.exec(row);
    const bib = fields.get("BIB") ?? null;
    // Chicago labels the net column Finish. Boston labels Finish Net and Finish Gun.
    const clocks = clocksFromText(fields.get("Finish Net") ?? fields.get("Finish") ?? null, fields.get("Finish Gun") ?? null);
    if ("skip" in clocks) {
      skippedUnparsed += 1;
      continue;
    }
    const built = buildFinish({
      externalResultId: idMatch?.[1] ?? null,
      athleteName,
      bib,
      sex,
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
  return { results, skippedYouth, skippedUnparsed };
}

export function mikaListUrl(input: {
  listUrl: string;
  event: string;
  page: number;
  pageSize: number;
  sex: "M" | "W" | "X";
}): string {
  const url = new URL(input.listUrl);
  url.searchParams.set("pid", "list");
  url.searchParams.set("page", String(input.page));
  url.searchParams.set("event", input.event);
  url.searchParams.set("num_results", String(input.pageSize));
  url.searchParams.set("search[sex]", input.sex);
  url.searchParams.set("search[age_class]", "%");
  url.searchParams.set("search[nation]", "%");
  return url.toString();
}
