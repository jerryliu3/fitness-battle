import { formatAppDateTime } from "./period";
import { APP_TIMEZONE, dayKey } from "./timezone";
import { activityEffort } from "./compete/effort";
import { competeNow, formatEffort, formatVolume } from "./compete/engine";
import { formatEloDelta } from "./compete/history";
import { countsOnTrack } from "./compete/ledger";
import { roundEnrollment } from "./compete/round-reveal";
import { SPORT_IDS, sportById, type CompeteState, type PeriodResult, type UnitSystem } from "./compete/sports";
import { competitionReplayFrame, indexCompetitionReplay, type CompetitionReplay } from "./competition-replay";

export type WeekRecapPage = { kind: "arrival" } | { kind: "results" | "effort"; result: PeriodResult };
export interface WeekRecapPodiumEntry { id: string; name: string; place: number; you: boolean; avatarUrl?: string | null; metricLabel: string }
export interface WeekRecapPodiumSlot { step: 1 | 2 | 3; entry: WeekRecapPodiumEntry | null }
export interface WeekRecapNextRound { pill: string; detail: string; subtext: string; active: boolean }

export function formatPeriodDateRange(periodStart: string, periodEnd: string): string {
  const fmt = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE });
  return `${fmt(Date.parse(periodStart))} – ${fmt(Date.parse(periodEnd) - 1)}`;
}

/** roundReveal already chooses the display track; keep both pages of a sport together. */
export function weekRecapPages(results: readonly PeriodResult[]): WeekRecapPage[] {
  const ordered = [...results].sort((a, b) => SPORT_IDS.indexOf(a.sport) - SPORT_IDS.indexOf(b.sport));
  return [{ kind: "arrival" }, ...ordered.flatMap(result => [
    { kind: "results" as const, result },
    { kind: "effort" as const, result },
  ])];
}

export function weekRecapCopy(pages: readonly WeekRecapPage[], index: number) {
  const current = Math.min(index, pages.length - 1);
  const page = pages[current]!;
  const next = pages[current + 1];
  const last = current === pages.length - 1;
  return {
    current,
    page,
    last,
    title: page.kind === "arrival" ? "Small days. Quite a week." : page.kind === "results" ? "Race complete!" : "Week breakdown",
    description: page.kind === "arrival" ? "Your effort, your progress." : page.kind === "results" ? "Your week, settled." : "Your week in motion.",
    label: last ? "Done" : page.kind === "arrival" ? "Reveal my finish →" : page.kind === "results" ? "See week breakdown →"
      : `${next && next.kind !== "arrival" ? sportById(next.result.sport).name : "Next sport"} results →`,
  };
}

export function weekRecapBreakdown(state: CompeteState, result: PeriodResult) {
  const before = Math.round(result.eloBefore), after = Math.round(result.eloAfter);
  const negative = after - before < 0 && !result.frozen;
  return {
    negative,
    scoreLine: `Score ${before} → ${after} (${formatEloDelta(before, after)})${result.frozen ? " · Frozen" : ""}`,
    stats: [
      { icon: "time" as const, tone: "muted" as const, value: `${Math.round(result.movingSec / 60)} min`, label: "Total time" },
      { icon: "bolt" as const, tone: "gold" as const, value: formatEffort(result.effort), label: "Effort pts" },
      { icon: "scoring" as const, tone: "success" as const, value: `${after}`, label: "Rating" },
    ],
    nextRound: weekRecapNextRound(state, result),
  };
}

export function weekRecapMetrics(result: PeriodResult, units: UnitSystem) {
  return [
    { key: "Volume", value: formatVolume(result.sport, result.distanceM, result.movingSec, units, result.effort) },
    { key: "Effort", value: `${formatEffort(result.effort)} pts` },
    { key: "Rating", value: `${result.eloAfter}` },
  ] as const;
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
  const effortValues = dates.map(date => activities.filter(a => dayKey(new Date(a.startedAt), APP_TIMEZONE) <= date)
    .reduce((sum, a) => sum + activityEffort(a), 0));
  return {
    available: activities.length > 0,
    hasEffort: activities.length > 0 && effortValues.some(v => v > 0),
    labels: dates.map(date => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE })),
    values: dates.map(date => activities.filter(a => dayKey(new Date(a.startedAt), APP_TIMEZONE) <= date)
      .reduce((sum, a) => sum + a.movingSec / 60, 0)),
    effortValues,
  };
}

export function weekRecapNextRound(state: CompeteState, result: PeriodResult): WeekRecapNextRound {
  const enrollment = roundEnrollment(state, result);
  if (!enrollment.startsAt) {
    return {
      pill: "Not joined",
      detail: "No upcoming round scheduled",
      subtext: "Update sport settings to join again.",
      active: false,
    };
  }
  const nowMs = competeNow(state).getTime();
  const startsMs = enrollment.startsAt.getTime();
  const diffMs = Math.max(0, startsMs - nowMs);
  let pill = "Active now";
  if (enrollment.status === "upcoming") {
    if (diffMs < 3_600_000) {
      pill = `Starts in ${Math.max(1, Math.ceil(diffMs / 60_000))}m`;
    } else {
      const hours = Math.ceil(diffMs / 3_600_000);
      pill = hours < 48 ? `Starts in ${hours}h` : `Starts in ${Math.round(hours / 24)}d`;
    }
  }
  return {
    pill,
    detail: enrollment.status === "upcoming"
      ? formatAppDateTime(enrollment.startsAt)
      : `Started ${formatAppDateTime(enrollment.startsAt)}`,
    subtext: enrollment.renews ? "Renews after this round." : "Stops after this round.",
    active: true,
  };
}

const PODIUM_ORDER = {
  1: [1],
  2: [2, 1],
  3: [2, 1, 3],
} as const;

export function weekRecapPodium(
  replay: CompetitionReplay | null,
  state: CompeteState,
  result: PeriodResult,
  hiddenIds: readonly string[] = [],
): WeekRecapPodiumSlot[] {
  const gps = sportById(result.sport).gps;
  const distUnit = state.units === "metric" ? "km" : "mi";
  const formatReplayMetric = (value: number, effort: number) =>
    gps ? `${value.toFixed(1)} ${distUnit}` : `${formatEffort(effort)} pts`;
  const youMetric = gps
    ? formatVolume(result.sport, result.distanceM, result.movingSec, state.units, result.effort)
    : `${formatEffort(result.effort)} pts`;

  if (replay) {
    const index = indexCompetitionReplay(replay, state.units);
    const visible = competitionReplayFrame(index, index.replay.events.length).rows
      .filter(row => !hiddenIds.includes(row.id));
    if (visible.length > 0) {
      const entries: WeekRecapPodiumEntry[] = visible.slice(0, 3).map(row => ({
        id: row.id,
        name: row.name,
        place: row.place,
        you: row.you,
        avatarUrl: row.you ? state.avatarUrl : row.avatarUrl,
        metricLabel: formatReplayMetric(row.value, row.effort),
      }));
      const count = entries.length <= 1 ? 1 : entries.length === 2 ? 2 : 3;
      return PODIUM_ORDER[count].map(step => ({ step, entry: entries[step - 1]! }));
    }
  }

  const youEntry: WeekRecapPodiumEntry = {
    id: "you",
    name: state.name || "You",
    place: result.place,
    you: true,
    avatarUrl: state.avatarUrl,
    metricLabel: youMetric,
  };
  const fallbackCount = result.fieldSize <= 1 ? 1 : result.fieldSize === 2 ? 2 : 3;
  return PODIUM_ORDER[fallbackCount].map(step => ({
    step,
    entry: result.place === step ? youEntry : null,
  }));
}
