import type { RoadDistance } from "../fingerprint";
import { buildFinish, clocksFromText, sexCode } from "./finish";
import type { IngestedFinish } from "./types";
import type { ResultsPage } from "./pagination";

export const NYRR_FINISHERS_API = "https://rmsprodapi.nyrr.org/api/v2/runners/finishers-filter";

export type NyrrRunner = {
  runnerId?: number | string;
  firstName?: string;
  lastName?: string;
  bib?: number | string;
  age?: number | string | null;
  gender?: string;
  overallTime?: string;
};

export type NyrrFinishersResponse = {
  totalItems?: number;
  items?: NyrrRunner[];
};

export type NyrrPage = ResultsPage & {
  totalItems: number;
};

const CHALLENGE = /(?:cf-browser-verification|captcha|access denied|just a moment)/i;

export function parseNyrrFinishersPage(
  payload: NyrrFinishersResponse,
  options: {
    eventCode: string;
    distance: RoadDistance;
    sourceUrl: string;
    pageIndex: number;
    pageSize: number;
  },
): NyrrPage {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.items)) {
    throw new Error("Invalid NYRR finishers response.");
  }
  const totalItems = Number(payload.totalItems ?? 0);
  if (!Number.isFinite(totalItems) || totalItems < 0) {
    throw new Error("NYRR response missing totalItems.");
  }
  const results: IngestedFinish[] = [];
  let skippedYouth = 0;
  let skippedUnparsed = 0;
  const rowKeys: string[] = [];
  let inputCount = 0;

  for (const row of payload.items) {
    inputCount += 1;
    if (row.runnerId == null || String(row.runnerId).trim() === "") {
      throw new Error("Missing NYRR runnerId; import held.");
    }
    const runnerId = String(row.runnerId).trim();
    const externalResultId = `${options.eventCode}:${runnerId}`;
    rowKeys.push(externalResultId);

    const ageYears = row.age == null || row.age === "" ? null : Number(row.age);
    if (ageYears != null && Number.isFinite(ageYears) && ageYears < 18) {
      skippedYouth += 1;
      continue;
    }
    const athleteName = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim();
    const clocks = clocksFromText(row.overallTime ?? null, null);
    if ("skip" in clocks) {
      skippedUnparsed += 1;
      continue;
    }
    const built = buildFinish({
      externalResultId,
      athleteName,
      bib: row.bib != null ? String(row.bib) : null,
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

  const totalPages = Math.max(1, Math.ceil(totalItems / options.pageSize));
  const isExhausted =
    payload.items.length === 0 ||
    options.pageIndex >= totalPages ||
    (options.pageIndex === totalPages && payload.items.length < options.pageSize);

  return {
    results,
    inputCount,
    rowKeys,
    skippedYouth,
    skippedUnparsed,
    totalItems,
    isExhausted: inputCount === 0 ? isExhausted : undefined,
  };
}

export async function fetchNyrrFinishers(
  fetchJson: (body: Record<string, unknown>) => Promise<unknown>,
  options: {
    eventCode: string;
    distance: RoadDistance;
    sourceUrl: string;
    pageSize?: number;
    maxPages?: number;
  },
): Promise<{ pages: NyrrPage[]; totalItems: number }> {
  const pageSize = options.pageSize ?? 100;
  const maxPages = options.maxPages ?? 800;
  let authoritativeTotal: number | null = null;
  const pages: NyrrPage[] = [];
  const seen = new Set<string>();

  for (let pageIndex = 1; pageIndex <= maxPages; pageIndex += 1) {
    const payload = (await fetchJson({
      eventCode: options.eventCode,
      searchString: null,
      handicap: null,
      sortColumn: "overallTime",
      sortDescending: false,
      pageIndex,
      pageSize,
    })) as NyrrFinishersResponse;

    const parsed = parseNyrrFinishersPage(payload, {
      eventCode: options.eventCode,
      distance: options.distance,
      sourceUrl: options.sourceUrl,
      pageIndex,
      pageSize,
    });

    if (authoritativeTotal == null) authoritativeTotal = parsed.totalItems;
    else if (parsed.totalItems !== authoritativeTotal) {
      throw new Error("NYRR totalItems changed during pagination.");
    }

    if (pageIndex === 1 && parsed.totalItems > 0 && parsed.inputCount === 0) {
      throw new Error("NYRR first page had zero rows despite positive totalItems.");
    }

    for (const key of parsed.rowKeys) {
      if (seen.has(key)) throw new Error(`Repeated NYRR runner on page ${pageIndex}.`);
      seen.add(key);
    }
    if (parsed.skippedUnparsed > 0) throw new Error(`Unparsed NYRR rows on page ${pageIndex}.`);

    pages.push(parsed);

    const totalPages = Math.max(1, Math.ceil(parsed.totalItems / pageSize));
    if (pageIndex >= totalPages) break;
    if (parsed.inputCount === 0) break;
  }

  const totalItems = authoritativeTotal ?? 0;
  const expectedPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (pages.length < expectedPages && totalItems > 0) {
    throw new Error(`NYRR pagination stopped early at page ${pages.length} of ${expectedPages}.`);
  }
  if (totalItems > 0 && seen.size !== totalItems) {
    throw new Error(`NYRR field incomplete: extracted ${seen.size} identities vs totalItems ${totalItems}.`);
  }

  return { pages, totalItems };
}

export function assertNyrrPayloadNotChallenge(text: string): void {
  if (CHALLENGE.test(text)) throw new Error("NYRR response looks like a challenge page.");
}
