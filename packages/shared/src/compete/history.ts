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

export function appendPeriodResults(
  existing: PeriodResult[],
  additions: PeriodResult[],
): PeriodResult[] {
  if (additions.length === 0) return existing;
  const byId = new Map<string, PeriodResult>();
  for (const row of existing) byId.set(row.id, row);
  for (const row of additions) byId.set(row.id, row);
  return [...byId.values()]
    .sort((a, b) => b.periodStart.localeCompare(a.periodStart) || a.sport.localeCompare(b.sport))
    .slice(0, MAX_PERIOD_RESULTS);
}

export function pendingPeriodResults(
  results: PeriodResult[],
  pendingIds: string[],
): PeriodResult[] {
  if (pendingIds.length === 0) return [];
  const wanted = new Set(pendingIds);
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
  pendingIds: string[],
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
