import type { RoadDistance } from "../fingerprint";
import { buildFinish, clocksFromText, sexCode } from "./finish";
import type { ResultsPage } from "./pagination";
import type { IngestedFinish } from "./types";

export const MARATHONGUIDE_RUNZY_API = "https://back.runzy.com/mg/event-results";

export type MarathonGuideRunner = {
  id: number;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  bib?: string | number;
  sex?: string;
  age?: number | null;
  chip_time?: string | null;
  final_time?: string | null;
};

export type MarathonGuideApiResponse = {
  results?: MarathonGuideRunner[];
  pagination?: {
    current_page?: number;
    per_page?: number;
    total?: number;
    last_page?: number;
    has_more_pages?: boolean;
  };
  primary_sub_event_id?: number;
  summary?: { total?: number };
};

export type MarathonGuideEventConfig = {
  slug: string;
  sourceSlug: string;
  sourceName: string;
  eventName: string;
  /** Runzy path segment, e.g. tokyo-marathon-copy */
  runzyRaceSlug: string;
  subEventId: number;
  editionYear: number;
  startsOn: string;
  distance: RoadDistance;
  sourceUrl: string;
  attribution: string;
  reuseNotes: string;
};

export const MARATHONGUIDE_TOKYO_2026: MarathonGuideEventConfig = {
  slug: "tokyo-marathon-2026-marathonguide",
  sourceSlug: "marathonguide_tokyo",
  sourceName: "MarathonGuide (third-party aggregator)",
  eventName: "Tokyo Marathon 2026",
  runzyRaceSlug: "tokyo-marathon-copy",
  subEventId: 963228,
  editionYear: 2026,
  startsOn: "2026-03-01",
  distance: "marathon",
  sourceUrl: "https://marathonguide.com/races/run/tokyo-marathon-copy/2026/results/",
  attribution: "Results via MarathonGuide / Runzy API (third-party; not official Tokyo Marathon timing)",
  reuseNotes:
    "Third-party aggregated listing. Record operator reuse decision before display. Finishers under 18 are not stored. Official MikaTiming 2026 list was empty; no checkpoint splits on this source.",
};

export function marathonGuideApiUrl(
  config: Pick<MarathonGuideEventConfig, "runzyRaceSlug" | "subEventId" | "editionYear">,
  options: { page: number; limit?: number },
): string {
  const url = new URL(`${MARATHONGUIDE_RUNZY_API}/${config.runzyRaceSlug}/`);
  url.searchParams.set("subevent", String(config.subEventId));
  url.searchParams.set("gender", "all");
  url.searchParams.set("age_group", "all");
  url.searchParams.set("page", String(options.page));
  url.searchParams.set("limit", String(options.limit ?? 100));
  url.searchParams.set("order_by", "over_all_place");
  url.searchParams.set("order_dir", "asc");
  url.searchParams.set("year", String(config.editionYear));
  return url.toString();
}

export function runnerDetailUrl(config: MarathonGuideEventConfig, runnerId: number): string {
  return `https://marathonguide.com/runner/results/${runnerId}/`;
}

export type MarathonGuidePage = ResultsPage & {
  totalItems: number;
};

export function parseMarathonGuideApiPage(
  payload: MarathonGuideApiResponse,
  options: {
    config: MarathonGuideEventConfig;
    pageIndex: number;
    pageSize: number;
  },
): MarathonGuidePage {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.results)) {
    throw new Error("Invalid MarathonGuide API response.");
  }
  const totalItems = Number(payload.pagination?.total ?? payload.summary?.total ?? 0);
  if (!Number.isFinite(totalItems) || totalItems < 0) {
    throw new Error("MarathonGuide response missing total.");
  }
  const results: IngestedFinish[] = [];
  let skippedYouth = 0;
  let skippedUnparsed = 0;
  const rowKeys: string[] = [];
  let inputCount = 0;

  for (const row of payload.results) {
    inputCount += 1;
    if (row.id == null || !Number.isFinite(Number(row.id))) {
      throw new Error("Missing MarathonGuide runner id; import held.");
    }
    const externalResultId = `mg:${row.id}`;
    rowKeys.push(externalResultId);

    const ageYears = row.age == null ? null : Number(row.age);
    if (ageYears != null && Number.isFinite(ageYears) && ageYears < 18) {
      skippedYouth += 1;
      continue;
    }
    const athleteName =
      (row.full_name ?? `${row.first_name ?? ""} ${row.last_name ?? ""}`).trim();
    const clocks = clocksFromText(row.chip_time ?? null, row.final_time ?? null);
    if ("skip" in clocks) {
      skippedUnparsed += 1;
      continue;
    }
    const built = buildFinish({
      externalResultId,
      athleteName,
      bib: row.bib != null ? String(row.bib) : null,
      sex: sexCode(row.sex),
      distance: options.config.distance,
      ageYears: ageYears != null && Number.isFinite(ageYears) ? ageYears : null,
      chipTimeMs: clocks.chipTimeMs,
      gunTimeMs: clocks.gunTimeMs,
      finishStatus: clocks.finishStatus,
      sourceUrl: runnerDetailUrl(options.config, row.id),
    });
    if ("skip" in built) {
      if (built.skip === "youth") skippedYouth += 1;
      else skippedUnparsed += 1;
      continue;
    }
    results.push(built.finish);
  }

  const lastPage = Number(payload.pagination?.last_page ?? Math.max(1, Math.ceil(totalItems / options.pageSize)));
  const isExhausted =
    payload.results.length === 0 || options.pageIndex >= lastPage || payload.pagination?.has_more_pages === false;

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