import { accountTimeZone, formatAccountDateTime, weeklyPeriodBounds, startOfZonedDay, shiftZonedDay } from "./period";
import { APP_TIMEZONE, dayKey } from "./timezone";
import { trainingXpInPeriod } from "./compete/training-xp";
import { arenaValueDecimals, competeChartUnit } from "./compete-field-view";
import { competeNow, formatVolume } from "./compete/engine";
import { countsOnTrack } from "./compete/ledger";
import { roundEnrollment } from "./compete/round-reveal";
import { SPORT_IDS, sportById, type CompeteState, type PeriodResult, type SportId, type UnitSystem } from "./compete/sports";
import { competitionReplayFrame, indexCompetitionReplay, type CompetitionReplay } from "./competition-replay";

export type WeekRecapPage =
  | { kind: "arrival" }
  | { kind: "results"; result: PeriodResult }
  | { kind: "effort"; sport: SportId; periodStart: string; periodEnd: string; result?: PeriodResult };

export interface WeekRecapPodiumEntry { id: string; name: string; place: number; you: boolean; avatarUrl?: string | null; metricLabel: string }
export interface WeekRecapPodiumSlot { step: 1 | 2 | 3; entry: WeekRecapPodiumEntry | null }
export interface WeekRecapNextRound { pill: string; detail: string; active: boolean }
export interface WeekRecapHighlight { icon: "trophy" | "bolt" | "progress"; tone: "gold" | "success" | "muted"; title: string; detail: string }
export interface WeekRecapHrRange { id: string; label: string; minutes: number; pct: number; tone: "high" | "warm" | "good" | "cool" }
export interface WeekRecapTarget { sport: SportId; periodStart: string; periodEnd: string; result?: PeriodResult }

export function formatPeriodDateRange(
  periodStart: string,
  periodEnd: string,
  timeZone: string = APP_TIMEZONE,
): string {
  const fmt = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone });
  return `${fmt(Date.parse(periodStart))} – ${fmt(Date.parse(periodEnd) - 1)}`;
}

export function formatAccountPeriodDateRange(
  state: { timezone?: string | null },
  periodStart: string,
  periodEnd: string,
): string {
  return formatPeriodDateRange(periodStart, periodEnd, accountTimeZone(state));
}

/** Returns the previous closed Mon-Mon week window when the athlete logged activities (used for non-racers + revisit link). */
export function settledWeekBreakdownTarget(state: CompeteState): { sport: SportId; periodStart: string; periodEnd: string } | null {
  const now = competeNow(state);
  const current = weeklyPeriodBounds(now, APP_TIMEZONE);
  const prev = weeklyPeriodBounds(new Date(current.startsAt.getTime() - 1000), APP_TIMEZONE);
  const startMs = prev.startsAt.getTime(), endMs = prev.endsAt.getTime();
  const inWindow = state.activities.filter(a => {
    const ms = Date.parse(a.startedAt);
    return ms >= startMs && ms < endMs && a.disposition !== "excluded";
  });
  if (!inWindow.length) return null;
  const bySport = new Map<SportId, number>();
  for (const a of inWindow) bySport.set(a.sport, (bySport.get(a.sport) ?? 0) + a.movingSec);
  const sport = [...bySport.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? state.primary;
  return { sport, periodStart: prev.startsAt.toISOString(), periodEnd: prev.endsAt.toISOString() };
}

/** Auto-trigger target for users who logged workouts last week without entering any settled race. */
export function nonRaceWeekBreakdownTarget(state: CompeteState): { sport: SportId; periodStart: string; periodEnd: string } | null {
  const target = settledWeekBreakdownTarget(state);
  if (!target) return null;
  const hasRace = state.periodResults.some(r => Date.parse(r.periodStart) === Date.parse(target.periodStart) && Date.parse(r.periodEnd) === Date.parse(target.periodEnd));
  return hasRace ? null : target;
}

/** roundReveal already chooses the display track; keep both pages of a sport together. */
export function weekRecapPages(
  results: readonly PeriodResult[],
  nonRaceWeek?: { sport: SportId; periodStart: string; periodEnd: string } | null,
): WeekRecapPage[] {
  if (!results.length && nonRaceWeek) {
    return [{ kind: "effort", sport: nonRaceWeek.sport, periodStart: nonRaceWeek.periodStart, periodEnd: nonRaceWeek.periodEnd }];
  }
  const ordered = [...results].sort((a, b) => SPORT_IDS.indexOf(a.sport) - SPORT_IDS.indexOf(b.sport));
  return [{ kind: "arrival" }, ...ordered.flatMap(result => [
    { kind: "results" as const, result },
    { kind: "effort" as const, sport: result.sport, periodStart: result.periodStart, periodEnd: result.periodEnd, result },
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
    label: last ? "Done" : page.kind === "arrival" ? "Reveal my finish →" : page.kind === "results" ? "See breakdown"
      : `${next && next.kind !== "arrival" ? sportById(next.kind === "results" ? next.result.sport : next.sport).name : "Next sport"} results →`,
  };
}

function breakdownActivities(state: CompeteState, target: WeekRecapTarget) {
  const start = Date.parse(target.periodStart), end = Date.parse(target.periodEnd);
  return state.activities.filter(a => {
    const ms = Date.parse(a.startedAt);
    if (!(ms >= start && ms < end)) return false;
    return target.result ? a.sport === target.result.sport && countsOnTrack(a, target.result.track) : a.disposition !== "excluded";
  });
}

export function weekRecapBreakdown(state: CompeteState, target: WeekRecapTarget) {
  const activities = breakdownActivities(state, target);
  const totalSec = target.result && activities.length === 0
    ? target.result.movingSec
    : activities.reduce((sum, a) => sum + a.movingSec, 0);
  const best = [...activities].sort((a, b) => {
    const aScore = sportById(a.sport).gps ? a.distanceM : a.movingSec;
    const bScore = sportById(b.sport).gps ? b.distanceM : b.movingSec;
    return bScore - aScore || b.movingSec - a.movingSec;
  })[0];
  const fallbackBest = !best && target.result && (target.result.distanceM > 0 || target.result.movingSec > 0)
    ? formatVolume(target.result.sport, target.result.distanceM, target.result.movingSec, state.units, target.result.effort)
    : "—";
  const bestValue = best ? formatVolume(best.sport, best.distanceM, best.movingSec, state.units) : fallbackBest;
  return {
    stats: [
      { icon: "time" as const, tone: "success" as const, value: `${Math.round(totalSec / 60)} min`, label: "Total time" },
      { icon: "progress" as const, tone: "gold" as const, value: String(activities.length), label: "Sessions" },
      { icon: "trophy" as const, tone: "muted" as const, value: bestValue, label: "Longest session" },
    ],
    nextRound: weekRecapNextRound(state, target),
  };
}

const HR_RANGES = [
  { id: "200+", label: "200+ bpm", min: 200, max: Infinity, tone: "high" as const },
  { id: "180-200", label: "180–200 bpm", min: 180, max: 200, tone: "high" as const },
  { id: "160-180", label: "160–180 bpm", min: 160, max: 180, tone: "warm" as const },
  { id: "140-160", label: "140–160 bpm", min: 140, max: 160, tone: "good" as const },
  { id: "120-140", label: "120–140 bpm", min: 120, max: 140, tone: "cool" as const },
  { id: "<120", label: "<120 bpm", min: 0, max: 120, tone: "cool" as const },
] as const;

export function weekRecapHeartRateRanges(state: CompeteState, target: WeekRecapTarget) {
  const activities = breakdownActivities(state, target);
  const secondsByBucket = new Map<string, number>();
  let hasGranular = false;
  for (const activity of activities) {
    const samples = activity.routeReplay?.filter(s => typeof s.heartRate === "number" && Number.isFinite(s.heartRate));
    if (samples && samples.length >= 2) {
      hasGranular = true;
      for (let i = 1; i < samples.length; i++) {
        const dt = Math.min(120, Math.max(0, samples[i]!.elapsedSec - samples[i - 1]!.elapsedSec));
        const hr = samples[i]!.heartRate!;
        const bucket = HR_RANGES.find(r => hr >= r.min && hr < r.max);
        if (bucket && dt > 0) secondsByBucket.set(bucket.id, (secondsByBucket.get(bucket.id) ?? 0) + dt);
      }
    } else if (activity.avgHr != null && Number.isFinite(activity.avgHr) && activity.avgHr > 0 && activity.movingSec > 0) {
      const bucket = HR_RANGES.find(r => activity.avgHr! >= r.min && activity.avgHr! < r.max);
      if (bucket) secondsByBucket.set(bucket.id, (secondsByBucket.get(bucket.id) ?? 0) + activity.movingSec);
    }
  }
  const totalSeconds = [...secondsByBucket.values()].reduce((a, b) => a + b, 0);
  const ranges: WeekRecapHrRange[] = HR_RANGES.flatMap(r => {
    const secs = secondsByBucket.get(r.id) ?? 0;
    if (secs <= 0 || totalSeconds <= 0) return [];
    return [{
      id: r.id,
      label: r.label,
      minutes: Math.max(1, Math.round(secs / 60)),
      pct: Math.round((secs / totalSeconds) * 100),
      tone: r.tone,
    }];
  });
  return { totalMinutes: Math.round(totalSeconds / 60), hasGranular, ranges };
}

export function weekRecapYourOvertakes(
  replay: CompetitionReplay | null | undefined,
  units: UnitSystem,
  hiddenIds: readonly string[] = [],
): number {
  if (!replay || replay.events.length === 0) return 0;
  const index = indexCompetitionReplay(replay, units);
  let overtakes = 0;
  let prevPlace: number | null = null;
  for (let step = 0; step <= index.replay.events.length; step++) {
    const rows = competitionReplayFrame(index, step).rows.filter(r => !hiddenIds.includes(r.id));
    const you = rows.find(r => r.you);
    if (!you) continue;
    if (prevPlace != null && you.place < prevPlace) overtakes += prevPlace - you.place;
    prevPlace = you.place;
  }
  return overtakes;
}

export function weekRecapMetrics(
  result: PeriodResult,
  units: UnitSystem,
  replay?: CompetitionReplay | null,
  hiddenIds: readonly string[] = [],
) {
  return [
    { key: sportById(result.sport).gps ? "Distance" : "Volume", value: formatVolume(result.sport, result.distanceM, result.movingSec, units, result.effort) },
    { key: "Overtakes", value: String(weekRecapYourOvertakes(replay, units, hiddenIds)) },
    { key: "Effort", value: `${Math.round(result.eloAfter)}` },
  ] as const;
}

export function weekRecapHighlights(
  replay: CompetitionReplay | null,
  state: CompeteState,
  result: PeriodResult,
  hiddenIds: readonly string[] = [],
): WeekRecapHighlight[] {
  const sport = sportById(result.sport);
  const distUnit = state.units === "metric" ? "km" : "mi";
  const divisor = state.units === "metric" ? 1000 : 1609.344;

  if (replay && replay.events.length > 0) {
    const index = indexCompetitionReplay(replay, state.units);
    const events = index.replay.events.filter(e => !hiddenIds.includes(e.athleteId));
    if (events.length > 0) {
      const totalDistM = events.reduce((s, e) => s + e.distanceM, 0);
      const totalMin = Math.round(events.reduce((s, e) => s + e.movingSec, 0) / 60);
      const activeIds = new Set(events.map(e => e.athleteId));
      let overtakes = 0, leadChanges = 0, prevLeader: string | null = null;
      const prevPlace = new Map<string, number>();
      for (let step = 1; step <= index.replay.events.length; step++) {
        const rows = competitionReplayFrame(index, step).rows.filter(r => !hiddenIds.includes(r.id) && r.value > 0);
        if (!rows.length) continue;
        if (prevLeader && rows[0]!.id !== prevLeader) leadChanges++;
        prevLeader = rows[0]!.id;
        for (const r of rows) {
          const prev = prevPlace.get(r.id);
          if (prev != null && r.place < prev) overtakes += prev - r.place;
          prevPlace.set(r.id, r.place);
        }
      }
      const fieldTotalText = sport.gps
        ? `${(totalDistM / divisor).toFixed(1)} ${distUnit}`
        : `${totalMin} min`;
      const finalRows = competitionReplayFrame(index, index.replay.events.length).rows.filter(r => !hiddenIds.includes(r.id));
      const topRow = finalRows[0];
      return [
        {
          icon: "bolt",
          tone: "gold",
          title: `Field covered ${fieldTotalText}`,
          detail: `${events.length} workout${events.length === 1 ? "" : "s"} across ${activeIds.size} competitor${activeIds.size === 1 ? "" : "s"}.`,
        },
        activeIds.size > 1
          ? {
            icon: "progress",
            tone: "success",
            title: leadChanges > 0 ? `${leadChanges} lead change${leadChanges === 1 ? "" : "s"}` : "Steady standings",
            detail: overtakes > 0
              ? `${overtakes} total position change${overtakes === 1 ? "" : "s"} across the field.`
              : "Positions held firm through the finish.",
          }
          : {
            icon: "progress",
            tone: "success",
            title: "Solo field run",
            detail: `${totalMin} active minutes logged this round.`,
          },
        ...(topRow ? [{
          icon: "trophy" as const,
          tone: "gold" as const,
          title: topRow.you ? "Top of the leaderboard" : `${topRow.name} led the field`,
          detail: activeIds.size > 1
            ? `${totalMin} total minutes logged by the field.`
            : `Led ${sport.name} for the week.`,
        }] : []),
      ];
    }
  }

  const acts = breakdownActivities(state, { sport: result.sport, periodStart: result.periodStart, periodEnd: result.periodEnd, result });
  const activeMin = Math.max(0, Math.round(result.movingSec / 60));
  return [
    {
      icon: "bolt",
      tone: "gold",
      title: `${result.fieldSize} athlete${result.fieldSize === 1 ? "" : "s"} in field`,
      detail: `${acts.length || 1} session${acts.length === 1 ? "" : "s"} logged in ${sport.name}.`,
    },
    {
      icon: "progress",
      tone: "success",
      title: `${activeMin} active minutes`,
      detail: result.fieldSize <= 1 ? "Solo week on the course." : "Steady standings through the week.",
    },
  ];
}

/** Calendar-date buckets preserve Eastern dates across DST and timestamp encodings. */
export function weekRecapTraining(state: CompeteState, target: WeekRecapTarget & { track?: PeriodResult["track"] }) {
  const displayTz = accountTimeZone(state);
  const start = Date.parse(target.periodStart), end = Date.parse(target.periodEnd);
  const track = target.result?.track ?? target.track;
  const activities = state.activities.filter(a => {
    const ms = Date.parse(a.startedAt);
    if (!(ms >= start && ms < end)) return false;
    return track ? a.sport === target.sport && countsOnTrack(a, track) : a.disposition !== "excluded";
  });
  const dates: string[] = [];
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    const last = dayKey(new Date(end - 1), displayTz);
    for (let date = dayKey(new Date(start), displayTz); date <= last;
      date = new Date(Date.parse(`${date}T12:00:00Z`) + 86400000).toISOString().slice(0, 10)) dates.push(date);
  }
  const trainingXpValues = dates.map(date => trainingXpInPeriod(state, new Date(start),
    new Date(Math.min(end, competeNow(state).getTime()+1, shiftZonedDay(startOfZonedDay(new Date(`${date}T12:00:00Z`), displayTz),1,displayTz).getTime())), [target.sport]));
  return {
    available: activities.length > 0 || trainingXpValues.some(v => v > 0),
    hasTrainingXp: trainingXpValues.some(v => v > 0),
    labels: dates.map(date => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: displayTz })),
    values: dates.map(date => activities.filter(a => dayKey(new Date(a.startedAt), displayTz) <= date)
      .reduce((sum, a) => sum + a.movingSec / 60, 0)),
    trainingXpValues,
  };
}

export function weekRecapNextRound(state: CompeteState, target: { sport: SportId; periodStart: string; periodEnd: string }): WeekRecapNextRound {
  const enrollment = roundEnrollment(state, target as PeriodResult);
  if (!enrollment.startsAt) {
    return {
      pill: "Not joined",
      detail: "No upcoming round scheduled",
      active: false,
    };
  }
  const nowMs = competeNow(state).getTime();
  const startsMs = enrollment.startsAt.getTime();
  const diffMs = Math.max(0, startsMs - nowMs);
  let countdown = "Active now";
  if (enrollment.status === "upcoming") {
    if (diffMs < 3_600_000) {
      countdown = `Starts in ${Math.max(1, Math.ceil(diffMs / 60_000))}m`;
    } else {
      const hours = Math.ceil(diffMs / 3_600_000);
      countdown = hours < 48 ? `Starts in ${hours}h` : `Starts in ${Math.round(hours / 24)}d`;
    }
  }
  return {
    pill: enrollment.status === "upcoming"
      ? formatAccountDateTime(state, enrollment.startsAt)
      : `Started ${formatAccountDateTime(state, enrollment.startsAt)}`,
    detail: countdown,
    active: true,
  };
}

const PODIUM_SLOTS = [2, 1, 3] as const;

export function weekRecapPodium(
  replay: CompetitionReplay | null,
  state: CompeteState,
  result: PeriodResult,
  hiddenIds: readonly string[] = [],
): WeekRecapPodiumSlot[] {
  const gps = sportById(result.sport).gps;
  const distUnit = state.units === "metric" ? "km" : "mi";
  const formatReplayMetric = (value: number) => {
    if (gps) return `${value.toFixed(1)} ${distUnit}`;
    const unit = competeChartUnit(result.sport, state.units);
    return `${value.toLocaleString("en-US", { maximumFractionDigits: arenaValueDecimals(unit) })} ${unit}`;
  };
  const youMetric = formatVolume(result.sport, result.distanceM, result.movingSec, state.units, result.effort);

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
        metricLabel: formatReplayMetric(row.value),
      }));
      return PODIUM_SLOTS.map(step => ({ step, entry: entries[step - 1] ?? null }));
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
  return PODIUM_SLOTS.map(step => ({
    step,
    entry: result.place === step ? youEntry : null,
  }));
}
