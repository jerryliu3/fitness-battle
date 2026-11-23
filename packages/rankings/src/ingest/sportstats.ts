import type { RoadDistance } from "../fingerprint";
import { buildFinish, sexCode } from "./finish";
import type { ResultsPage } from "./pagination";
import type { IngestedFinish } from "./types";

export const SPORTSTATS_RESULTS_API = "https://public.sportstats.one/getsortedresults";

export type SportstatsParticipant = {
  pid?: number;
  bib?: string | number | null;
  dn?: string | null;
  pnf?: string | null;
  pnl?: string | null;
  pdn?: string | null;
  pc?: string | null;
  ot?: number | null;
  pt?: number | null;
};

export type SportstatsResultsResponse = {
  ok?: boolean;
  participantData?: SportstatsParticipant[];
  info?: { total?: number; returned?: number; rs?: number };
};

export type SportstatsEventConfig = {
  slug: string;
  sourceSlug: string;
  sourceName: string;
  eventName: string;
  raceRid: number;
  editionYear: number;
  startsOn: string;
  distance: RoadDistance;
  sourceUrl: string;
  attribution: string;
  reuseNotes: string;
};

export const SPORTSTATS_TORONTO_2026: SportstatsEventConfig = {
  slug: "toronto-waterfront-marathon-2026",
  sourceSlug: "toronto_waterfront_marathon",
  sourceName: "TCS Toronto Waterfront Marathon",
  eventName: "TCS Toronto Waterfront Marathon 2026",
  raceRid: 146034,
  editionYear: 2026,
  startsOn: "2026-10-17",
  distance: "marathon",
  sourceUrl: "https://sportstats.one/event/toronto-waterfront-marathon/leaderboard/146034",
  attribution: "Official results via Sportstats (Canada Running Series)",
  reuseNotes:
    "Official Sportstats leaderboard API (public.sportstats.one). Record operator reuse decision before display. Splits available per participant; not ingested in this pass.",
};

export function sportstatsResultsUrl(
  config: Pick<SportstatsEventConfig, "raceRid">,
  options: { offset: number; limit?: number; sort?: string; timeType?: string },
): string {
  const url = new URL(SPORTSTATS_RESULTS_API);
  url.searchParams.set("rid", String(config.raceRid));
  url.searchParams.set("sort", options.sort ?? "overall");
  url.searchParams.set("timeType", options.timeType ?? "chip");
  url.searchParams.set("offset", String(options.offset));
  url.searchParams.set("limit", String(options.limit ?? 100));
  return url.toString();
}

export function sportstatsParticipantUrl(config: SportstatsEventConfig, pid: number): string {
  return `${config.sourceUrl}#pid=${pid}`;
}

function ageFromCategory(pc: string | null | undefined): number | null {
  if (!pc) return null;
  const match = /^[mfxu](\d+)/i.exec(pc.trim());
  if (!match) return null;
  const min = Number(match[1]);
  return Number.isFinite(min) ? min : null;
}

function sexFromCategory(pc: string | null | undefined): ReturnType<typeof sexCode> {
  if (!pc) return "unknown";
  return sexCode(pc.trim().charAt(0));
}

export type SportstatsPage = ResultsPage & {
  totalItems: number;
};

export function parseSportstatsResultsPage(
  payload: SportstatsResultsResponse,
  options: {
    config: SportstatsEventConfig;
    offset: number;
    pageSize: number;
    authoritativeTotal?: number;
  },
): SportstatsPage {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.participantData)) {
    throw new Error("Invalid Sportstats results response.");
  }
  const totalItems =
    options.authoritativeTotal ??
    Number(payload.info?.total ?? 0);
  if (!Number.isFinite(totalItems) || totalItems < 0) {
    throw new Error("Sportstats response missing total.");
  }
  const results: IngestedFinish[] = [];
  let skippedYouth = 0;
  let skippedUnparsed = 0;
  const rowKeys: string[] = [];
  let inputCount = 0;

  for (const row of payload.participantData) {
    inputCount += 1;
    const pid = row.pid;
    if (pid == null || !Number.isFinite(Number(pid))) {
      throw new Error("Missing Sportstats participant id; import held.");
    }
    const externalResultId = `ss:${options.config.raceRid}:${pid}`;
    rowKeys.push(externalResultId);

    const ageYears = ageFromCategory(row.pc);
    if (ageYears != null && ageYears < 18) {
      skippedYouth += 1;
      continue;
    }
    const athleteName =
      (row.dn ?? row.pdn ?? `${row.pnf ?? ""} ${row.pnl ?? ""}`).trim();
    const chipTimeMs = row.ot != null && row.ot > 0 ? Number(row.ot) : null;
    const finishStatus = chipTimeMs != null ? "finished" : row.pt === 0 ? "dnf" : "unparsed";

    const built = buildFinish({
      externalResultId,
      athleteName,
      bib: row.bib != null ? String(row.bib) : null,
      sex: sexFromCategory(row.pc),
      distance: options.config.distance,
      ageYears: null,
      chipTimeMs,
      gunTimeMs: null,
      finishStatus: finishStatus === "unparsed" ? "finished" : finishStatus,
      sourceUrl: sportstatsParticipantUrl(options.config, pid),
    });
    if ("skip" in built) {
      if (built.skip === "youth") skippedYouth += 1;
      else skippedUnparsed += 1;
      continue;
    }
    results.push(built.finish);
  }

  const isExhausted =
    payload.participantData.length === 0 ||
    options.offset + payload.participantData.length >= totalItems;

  return {
    results,
    inputCount,
    rowKeys,
    skippedYouth,
    skippedUnparsed,
    totalItems,
    isExhausted,
  };
}