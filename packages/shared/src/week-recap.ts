import { APP_TIMEZONE, dayKey } from "./timezone";
import { countsOnTrack } from "./compete/ledger";
import { SPORT_IDS, type CompeteState, type PeriodResult } from "./compete/sports";

export type WeekRecapPage = { kind: "arrival" } | { kind: "results" | "effort"; result: PeriodResult };

/** roundReveal already chooses the display track; keep both pages of a sport together. */
export function weekRecapPages(results: readonly PeriodResult[]): WeekRecapPage[] {
  const ordered = [...results].sort((a, b) => SPORT_IDS.indexOf(a.sport) - SPORT_IDS.indexOf(b.sport));
  return [{ kind: "arrival" }, ...ordered.flatMap(result => [
    { kind: "results" as const, result },
    { kind: "effort" as const, result },
  ])];
}

/** Calendar-date buckets preserve Eastern dates across DST and timestamp encodings. */
export function weekRecapTraining(state: CompeteState, result: PeriodResult) {
  const start = Date.parse(result.periodStart), end = Date.parse(result.periodEnd);
  const activities = state.activities.filter(a => a.sport === result.sport && countsOnTrack(a, result.track)
    && Date.parse(a.startedAt) >= start && Date.parse(a.startedAt) < end);
  const dates: string[] = [];
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    const last = dayKey(new Date(end - 1), APP_TIMEZONE);
    for (let date = dayKey(new Date(start), APP_TIMEZONE); date <= last;
      date = new Date(Date.parse(`${date}T12:00:00Z`) + 86400000).toISOString().slice(0, 10)) dates.push(date);
  }
  return {
    available: activities.length > 0,
    labels: dates.map(date => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE })),
    values: dates.map(date => activities.filter(a => dayKey(new Date(a.startedAt), APP_TIMEZONE) <= date)
      .reduce((sum, a) => sum + a.movingSec / 60, 0)),
  };
}
