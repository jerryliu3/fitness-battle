import { CHECKPOINT_PROFILES, normalizeCheckpointLabel } from "./checkpoint-profiles";
import type { ParsedMikaSplits } from "./mikatiming-splits";
import { parseRaceTimeMs } from "../time";

export const NYRR_RESULT_DETAILS_API = "https://rmsprodapi.nyrr.org/api/v2/runners/resultDetails";

export type NyrrSplitResult = {
  splitCode?: string;
  time?: string | null;
};

export type NyrrResultDetails = {
  runnerId?: number | string;
  bib?: string;
  splitResults?: NyrrSplitResult[];
};

function labelMatches(candidate: string, accepted: readonly string[]): boolean {
  const normalized = normalizeCheckpointLabel(candidate).toLowerCase();
  return accepted.some((entry) => normalizeCheckpointLabel(entry).toLowerCase() === normalized);
}

export function parseNyrrSplitResults(
  details: NyrrResultDetails,
  profileId: keyof typeof CHECKPOINT_PROFILES | string,
): ParsedMikaSplits {
  const profile = CHECKPOINT_PROFILES[profileId];
  if (!profile) throw new Error(`Unknown checkpoint profile ${profileId}.`);
  const raw = details.splitResults ?? [];
  const rows = raw
    .map((row) => {
      const label = row.splitCode?.trim();
      const elapsedMs = row.time ? parseRaceTimeMs(row.time) : null;
      if (!label || elapsedMs == null) return null;
      return { label, elapsedMs };
    })
    .filter((row): row is { label: string; elapsedMs: number } => row != null);

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

  if (elapsedMs.every((ms) => ms == null)) {
    throw new Error("No NYRR split rows aligned to checkpoint profile.");
  }

  return { profileId: profile.id, elapsedMs, sourceLabels };
}

export function nyrrResultPageUrl(eventCode: string, bib: string | number): string {
  return `https://results.nyrr.org/event/${eventCode}/result/${bib}`;
}