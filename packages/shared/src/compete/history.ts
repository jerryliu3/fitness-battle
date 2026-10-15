import type { PeriodResult, SportId } from "./sports";

/** Keep about a year of weekly open+verified rows without unbounded growth. */
export const MAX_PERIOD_RESULTS = 104;

export function periodResultId(
  periodStart: string,
  sport: SportId,
  track: "verified" | "open",
): string {
  return `${periodStart}:${sport}:${track}`;
}

export function isPeriodResultPending(row: PeriodResult): boolean {
  return row.acknowledgedAt == null || row.acknowledgedAt === "";
}

/** Derive pending reveal ids from settled rows (acknowledged_at is null). */
export function pendingRevealIdsFromResults(
  results: PeriodResult[],
): string[] {
  return results.filter(isPeriodResultPending).map((row) => row.id);
}

/**
 * Align legacy pendingRevealIds with acknowledgedAt on each result.
 * Only runs when a legacy pending list is present on the document.
 */
export function syncPeriodResultAcknowledgements(
  results: PeriodResult[],
  pendingIds: string[] | undefined,
): PeriodResult[] {
  if (!Array.isArray(results) || results.length === 0) return results ?? [];
  if (pendingIds === undefined) return results;
  const pending = new Set(pendingIds);
  return results.map((row) => {
    if (pending.has(row.id)) {
      return { ...row, acknowledgedAt: null };
    }
    if (isPeriodResultPending(row)) {
      return {
        ...row,
        acknowledgedAt: row.settledAt ?? new Date(0).toISOString(),
      };
    }
    return row;
  });
}

/**
 * Account writes store `pendingRevealIds: []` and use `acknowledgedAt` as SoT.
 * An empty array must NOT run legacy sync — that would auto-ack every pending
 * week and wipe the week-complete reveal. Sync only when:
 * - legacy list has ids to keep pending, or
 * - results predate the acknowledgedAt field (missing key).
 */
export function shouldSyncLegacyPendingReveals(
  results: PeriodResult[],
  pendingIds: string[] | undefined,
): boolean {
  if (pendingIds === undefined) return false;
  if (pendingIds.length > 0) return true;
  return results.some((row) => !("acknowledgedAt" in row));
}

export function acknowledgePeriodResults(
  results: PeriodResult[],
  revealIds: string[] | null,
  at: string = new Date().toISOString(),
): PeriodResult[] {
  if (revealIds == null || revealIds.length === 0) {
    return results.map((row) =>
      isPeriodResultPending(row) ? { ...row, acknowledgedAt: at } : row,
    );
  }
  const clear = new Set(revealIds);
  return results.map((row) =>
    clear.has(row.id) && isPeriodResultPending(row)
      ? { ...row, acknowledgedAt: at }
      : row,
  );
}

export function appendPeriodResults(
  existing: PeriodResult[],
  additions: PeriodResult[],
): PeriodResult[] {
  if (additions.length === 0) return existing;
  const byId = new Map<string, PeriodResult>();
  for (const row of existing) byId.set(row.id, row);
  for (const row of additions) byId.set(row.id, row);
  return [...byId.values()]
    .sort(
      (a, b) =>
        b.periodStart.localeCompare(a.periodStart) ||
        a.sport.localeCompare(b.sport),
    )
    .slice(0, MAX_PERIOD_RESULTS);
}

export function pendingPeriodResults(
  results: PeriodResult[],
  pendingIds?: string[],
): PeriodResult[] {
  const ids = pendingIds ?? pendingRevealIdsFromResults(results);
  if (ids.length === 0) return [];
  const wanted = new Set(ids);
  return results
    .filter((row) => wanted.has(row.id))
    .sort(
      (a, b) =>
        b.periodStart.localeCompare(a.periodStart) ||
        a.sport.localeCompare(b.sport) ||
        a.track.localeCompare(b.track),
    );
}

/** Prefer open-track rows for the primary sport in the week-complete reveal. */
export function primaryRevealResults(
  results: PeriodResult[],
  pendingIds: string[] | undefined,
  primary: SportId,
): PeriodResult[] {
  const pending = pendingPeriodResults(results, pendingIds);
  if (pending.length === 0) return [];
  const latestStart = pending[0]!.periodStart;
  const latestWeek = pending.filter((row) => row.periodStart === latestStart);
  const primaryOpen = latestWeek.filter(
    (row) => row.sport === primary && row.track === "open",
  );
  if (primaryOpen.length) return primaryOpen;
  const primaryAny = latestWeek.filter((row) => row.sport === primary);
  if (primaryAny.length) return primaryAny;
  return latestWeek.filter((row) => row.track === "open");
}

export function formatEloDelta(before: number, after: number): string {
  const delta = after - before;
  if (delta === 0) return "0";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

export function formatPlace(place: number, fieldSize: number): string {
  return `${place} / ${fieldSize}`;
}
