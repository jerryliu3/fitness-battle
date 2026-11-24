import { CHECKPOINT_PROFILES, normalizeCheckpointLabel, type MarathonCheckpointProfile } from "./checkpoint-profiles";
import { localWallClockToIso, parseWallClockSeconds } from "./start-time";
import { parseRaceTimeMs } from "../time";

export type ParsedSplitRow = {
  label: string;
  elapsedMs: number;
  timeOfDaySeconds?: number | null;
};

export type ParsedMikaSplits = {
  profileId: string;
  elapsedMs: (number | null)[];
  sourceLabels: string[];
  startAt?: string | null;
};

const ROW =
  /<tr[^>]*class="[^"]*\bf-time[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
const START_TIME_NET =
  /<tr[^>]*class="[^"]*\bf-starttime_net\b[^"]*"[^>]*>[\s\S]*?<td[^>]*>\s*([^<]+)/i;

function rowLabel(rowHtml: string): string | null {
  const match = /<th[^>]*class="[^"]*desc[^"]*"[^>]*>\s*([^<]+)/i.exec(rowHtml);
  return match ? normalizeCheckpointLabel(match[1]) : null;
}

function rowCumulativeMs(rowHtml: string): number | null {
  const match = /<td[^>]*class="time"[^>]*>\s*([^<]+)/i.exec(rowHtml);
  if (!match) return null;
  const text = match[1].trim();
  if (!text || text === "--" || text === "-") return null;
  return parseRaceTimeMs(text);
}

function rowTimeOfDaySeconds(rowHtml: string): number | null {
  const match = /<td[^>]*class="time_day"[^>]*>\s*([^<]+)/i.exec(rowHtml);
  return match ? parseWallClockSeconds(match[1]) : null;
}

/** Read local net start wall-clock seconds since midnight from a MikaTiming detail page. */
export function parseMikaTimingStartSeconds(html: string): number | null {
  const direct = START_TIME_NET.exec(html);
  if (direct) {
    const parsed = parseWallClockSeconds(direct[1]);
    if (parsed != null) return parsed;
  }
  for (const match of html.matchAll(ROW)) {
    const rowHtml = match[1];
    const tod = rowTimeOfDaySeconds(rowHtml);
    const elapsedMs = rowCumulativeMs(rowHtml);
    if (tod != null && elapsedMs != null && elapsedMs > 0) {
      const startSec = tod - Math.round(elapsedMs / 1000);
      if (startSec >= 0 && startSec < 86_400) return startSec;
    }
  }
  return null;
}

/** Read cumulative chip split times from a MikaTiming athlete detail page. */
export function parseMikaTimingDetailSplits(html: string): ParsedSplitRow[] {
  const rows: ParsedSplitRow[] = [];
  for (const match of html.matchAll(ROW)) {
    const rowHtml = match[1];
    const label = rowLabel(rowHtml);
    const elapsedMs = rowCumulativeMs(rowHtml);
    if (!label || elapsedMs == null) continue;
    if (/^split$/i.test(label) || /^finish time$/i.test(label)) continue;
    rows.push({ label, elapsedMs, timeOfDaySeconds: rowTimeOfDaySeconds(rowHtml) });
  }
  return rows;
}

function labelMatches(candidate: string, accepted: readonly string[]): boolean {
  const normalized = normalizeCheckpointLabel(candidate).toLowerCase();
  return accepted.some((entry) => normalizeCheckpointLabel(entry).toLowerCase() === normalized);
}

function alignRowsToProfile(rows: ParsedSplitRow[], profile: MarathonCheckpointProfile): ParsedMikaSplits {
  const elapsedMs: (number | null)[] = profile.distancesM.map(() => null);
  const sourceLabels: string[] = profile.distancesM.map(() => "");

  for (let i = 0; i < profile.distancesM.length; i += 1) {
    const accepted = profile.labelAliases[i] ?? [profile.labels[i]];
    const row = rows.find((candidate) => labelMatches(candidate.label, accepted));
    if (row) {
      elapsedMs[i] = row.elapsedMs;
      sourceLabels[i] = row.label;
    }
  }

  return { profileId: profile.id, elapsedMs, sourceLabels };
}

export function mikaSplitsForProfile(
  html: string,
  profileId: keyof typeof CHECKPOINT_PROFILES | string,
  options?: { startsOn?: string; timeZone?: string },
): ParsedMikaSplits {
  const profile = CHECKPOINT_PROFILES[profileId];
  if (!profile) throw new Error(`Unknown checkpoint profile ${profileId}.`);
  const rows = parseMikaTimingDetailSplits(html);
  if (rows.length === 0) throw new Error("No split rows on MikaTiming detail page.");
  const aligned = alignRowsToProfile(rows, profile);
  if (options?.startsOn && options?.timeZone) {
    const startSec = parseMikaTimingStartSeconds(html);
    if (startSec != null) {
      aligned.startAt = localWallClockToIso(options.startsOn, startSec, options.timeZone);
    }
  }
  return aligned;
}

export function mikaDetailUrl(listUrl: string, idp: string): string {
  const url = new URL(listUrl);
  url.search = "";
  url.searchParams.set("content", "detail");
  url.searchParams.set("idp", idp);
  return url.toString();
}