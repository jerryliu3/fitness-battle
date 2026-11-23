import type { RoadDistance } from "../fingerprint";
import { buildFinish, sexCode } from "./finish";
import type { ResultsPage } from "./pagination";
import type { IngestedFinish } from "./types";

export const CHRONOTRACK_CTLIVE_ORIGIN = "https://live.chronotrack.com";
export const CHRONOTRACK_REIGNITE_ORIGIN = CHRONOTRACK_CTLIVE_ORIGIN;

export type ChronotrackResultRow = {
  id: number;
  age: number | null;
  bib: string | null;
  chipTimeInMillis: number | null;
  gunTimeInMillis: number | null;
  displayName: string | null;
  gender: string | null;
  status: string | null;
  private?: boolean;
};

export function chronotrackEntryUrl(eventId: number, entryId: number | string): string {
  return `${CHRONOTRACK_CTLIVE_ORIGIN}/event/${eventId}/results/entry/${entryId}`;
}

export function chronotrackResultsUrl(input: {
  eventId: number;
  raceId: number;
  from: number;
  limit: number;
}): string {
  const params = new URLSearchParams({
    from: String(input.from),
    limit: String(input.limit),
  });
  return `https://reignite-api.athlinks.com/azp/ctlive/event/${input.eventId}/race/${input.raceId}/results?${params}`;
}

function finishStatusFromChronotrack(status: string | null | undefined): IngestedFinish["finishStatus"] {
  const token = (status ?? "").trim().toUpperCase();
  if (token === "DNF") return "dnf";
  if (token === "DNS") return "dns";
  if (token === "DQ" || token === "DSQ") return "dq";
  return "finished";
}

/** One AZP race-results page (overall chip ranking on the full-course interval). */
export function parseChronotrackResultsPage(
  payload: unknown,
  options: { distance: RoadDistance; eventId: number; sourceUrl: string },
): ResultsPage {
  const root = Array.isArray(payload) ? payload[0] : payload;
  if (!root || typeof root !== "object") {
    throw new Error("Unrecognized ChronoTrack results payload.");
  }
  const intervals = (root as { intervals?: { full?: boolean; results?: ChronotrackResultRow[] }[] }).intervals;
  const interval = intervals?.find((row) => row.full) ?? intervals?.[0];
  const upstream = interval?.results ?? [];

  const results: IngestedFinish[] = [];
  let skippedYouth = 0;
  let skippedUnparsed = 0;
  const rowKeys: string[] = [];

  for (const row of upstream) {
    const externalResultId = row.id != null ? String(row.id) : null;
    rowKeys.push(externalResultId ?? `row-${results.length + skippedUnparsed + skippedYouth}`);
    if (row.age != null && row.age < 18) {
      skippedYouth += 1;
      continue;
    }
    const built = buildFinish({
      externalResultId,
      athleteName: (row.displayName ?? "").trim(),
      bib: row.bib != null ? String(row.bib) : null,
      sex: sexCode(row.gender),
      distance: options.distance,
      ageYears: row.age != null && row.age >= 18 ? row.age : null,
      chipTimeMs: row.chipTimeInMillis ?? null,
      gunTimeMs: row.gunTimeInMillis ?? null,
      finishStatus: finishStatusFromChronotrack(row.status),
      sourceUrl: externalResultId != null ? chronotrackEntryUrl(options.eventId, externalResultId) : options.sourceUrl,
    });
    if ("skip" in built) {
      if (built.skip === "youth") skippedYouth += 1;
      else skippedUnparsed += 1;
      continue;
    }
    results.push(built.finish);
  }

  return {
    results,
    inputCount: upstream.length,
    rowKeys,
    skippedYouth,
    skippedUnparsed,
    isExhausted: upstream.length === 0,
  };
}

export function chronotrackResultUrl(eventId: number, entryId: number | string): string {
  return `https://reignite-api.athlinks.com/azp/ctlive/event/${eventId}/entry/${entryId}/result`;
}

/** Hydrated AZP entry from a ChronoTrack Live athlete results page. */
export function chronotrackEntryResultFromHtml(
  html: string,
  eventId: number,
  entryId: number | string,
): unknown {
  const match = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!match) throw new Error("ChronoTrack entry page missing __NEXT_DATA__.");
  const data = JSON.parse(match[1]) as {
    props?: {
      pageProps?: {
        initialState?: {
          reigniteApi?: {
            queries?: Record<string, { data?: unknown }>;
          };
        };
      };
    };
  };
  const queries = data.props?.pageProps?.initialState?.reigniteApi?.queries ?? {};
  const exact = `getAzpEntryWithResult({"entryId":${entryId},"eventId":${eventId}})`;
  const hit = queries[exact]?.data;
  if (hit) return hit;
  const loose = Object.entries(queries).find(
    ([key, value]) => key.startsWith("getAzpEntryWithResult") && key.includes(String(entryId)) && value?.data,
  );
  if (loose?.[1]?.data) return loose[1].data;
  throw new Error("ChronoTrack entry page missing split payload.");
}