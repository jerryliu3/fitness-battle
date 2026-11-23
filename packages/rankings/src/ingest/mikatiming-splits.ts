import { CHECKPOINT_PROFILES, normalizeCheckpointLabel, type MarathonCheckpointProfile } from "./checkpoint-profiles";
import { parseRaceTimeMs } from "../time";

export type ParsedSplitRow = {
  label: string;
  elapsedMs: number;
};

export type ParsedMikaSplits = {
  profileId: string;
  elapsedMs: (number | null)[];
  sourceLabels: string[];
};

const ROW =
  /<tr[^>]*class="[^"]*\bf-time[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;

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

/** Read cumulative chip split times from a MikaTiming athlete detail page. */
export function parseMikaTimingDetailSplits(html: string): ParsedSplitRow[] {
  const rows: ParsedSplitRow[] = [];
  for (const match of html.matchAll(ROW)) {
    const rowHtml = match[1];
    const label = rowLabel(rowHtml);
    const elapsedMs = rowCumulativeMs(rowHtml);
    if (!label || elapsedMs == null) continue;
    if (/^split$/i.test(label) || /^finish time$/i.test(label)) continue;
    rows.push({ label, elapsedMs });
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
): ParsedMikaSplits {
  const profile = CHECKPOINT_PROFILES[profileId];
  if (!profile) throw new Error(`Unknown checkpoint profile ${profileId}.`);
  const rows = parseMikaTimingDetailSplits(html);
  if (rows.length === 0) throw new Error("No split rows on MikaTiming detail page.");
  return alignRowsToProfile(rows, profile);
}

export function mikaDetailUrl(listUrl: string, idp: string): string {
  const url = new URL(listUrl);
  url.search = "";
  url.searchParams.set("content", "detail");
  url.searchParams.set("idp", idp);
  return url.toString();
}