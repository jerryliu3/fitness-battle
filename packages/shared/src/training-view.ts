import { readAccountEffort } from './compete/effort-account';
import {
  APP_TIMEZONE,
  dailyPeriodBounds,
  dayKey,
  monthlyPeriodBounds,
  shiftZonedDay,
  weeklyPeriodBounds,
} from "./period";
import { countsForTraining } from "./compete/journal";
import { isVerifiedActivity } from "./compete/ledger";
import { periodEffort } from "./compete/effort";
import { competeNow } from "./compete/engine";
import {
  ELO_CAP,
  SPORT_IDS,
  sportById,
  type Activity,
  type CompeteState,
  type ScoreTrack,
  type SportId,
} from "./compete/sports";
import type { TrainingRange } from "./training-types";

export type { TrainingRange } from "./training-types";
export type TrainingSportFilter = SportId | "all" | readonly SportId[];

export function defaultTrainingSports(): SportId[] {
  return [...SPORT_IDS];
}

export function isAllTrainingSports(sports: readonly SportId[]): boolean {
  return (
    sports.length === SPORT_IDS.length &&
    SPORT_IDS.every((id) => sports.includes(id))
  );
}

/** Toggle one sport in a multi-select; never returns an empty list. */
export function normalizeTrainingSports(sports: readonly SportId[]): SportId[] {
  const picked = new Set(sports);
  return SPORT_IDS.filter((id) => picked.has(id));
}

export function toggleTrainingSports(
  current: readonly SportId[],
  id: SportId,
): SportId[] {
  if (isAllTrainingSports(current)) {
    return [id];
  }
  const next = current.includes(id)
    ? current.filter((sport) => sport !== id)
    : [...current, id];
  return next.length && next.length < SPORT_IDS.length
    ? normalizeTrainingSports(next)
    : defaultTrainingSports();
}

export function trainingSportFilterLabel(sports: readonly SportId[]): string {
  if (isAllTrainingSports(sports)) return "All sports";
  if (sports.length === 0) return "Sports";
  if (sports.length === 1) return sportById(sports[0]!).name;
  return `${sports.length} sports`;
}

function sportMatches(sport: SportId, filter: TrainingSportFilter): boolean {
  if (filter === "all") return true;
  if (typeof filter === "string") return sport === filter;
  if (!filter.length) return false;
  return filter.includes(sport);
}
export interface TrainingBucket {
  start: string; end: string; label: string; movingSec: number; sessions: number; distanceM: number; partial: boolean;
}
export function shiftTrainingMonth(
  anchor: Date,
  months: number,
  timeZone = APP_TIMEZONE,
): Date {
  const [year, month] = dayKey(anchor, timeZone).split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1 + months, 1, 12));
}

/** Noon UTC on January 1 of the account calendar year, so buckets match the heading. */
export function trainingYearAnchor(
  now: Date,
  yearOffset = 0,
  timeZone = APP_TIMEZONE,
): Date {
  const year = Number(dayKey(now, timeZone).slice(0, 4)) + yearOffset;
  return new Date(Date.UTC(year, 0, 1, 12));
}
function eligible(
  activities: Activity[],
  sport: TrainingSportFilter,
  track: ScoreTrack,
  now: Date,
) {
  return activities.filter(
    (a) =>
      sportMatches(a.sport, sport) &&
      countsForTraining(a) &&
      (track === "open" || isVerifiedActivity(a)) &&
      Number.isFinite(Date.parse(a.startedAt)) &&
      Date.parse(a.startedAt) <= now.getTime(),
  );
}
function bucket(rows: Activity[], start: Date, end: Date, now: Date, label: string): TrainingBucket {
  const included = rows.filter(a => Date.parse(a.startedAt) >= start.getTime() && Date.parse(a.startedAt) < end.getTime());
  return { start: start.toISOString(), end: end.toISOString(), label, movingSec: included.reduce((t,a)=>t+Math.max(0,a.movingSec),0), distanceM: included.reduce((t,a)=>t+Math.max(0,a.distanceM),0), sessions: included.length, partial: start <= now && now < end };
}
/** Calendar buckets follow the account timezone; half-open, no synthetic activity. Month bars are clipped weeks. */
export function trainingBuckets(
  activities: Activity[],
  sport: TrainingSportFilter,
  range: TrainingRange,
  anchor: Date,
  now = new Date(),
  track: ScoreTrack = "open",
  timeZone = APP_TIMEZONE,
): TrainingBucket[] {
  const rows = eligible(activities, sport, track, now);
  const week = weeklyPeriodBounds(anchor, timeZone);
  const month = monthlyPeriodBounds(anchor, timeZone);
  if (range === "year") {
    const year = Number(dayKey(anchor, timeZone).slice(0, 4));
    return Array.from({ length: 12 }, (_, i) => {
      const at = new Date(Date.UTC(year, i, 1, 12));
      const bounds = monthlyPeriodBounds(at, timeZone);
      return bucket(
        rows,
        bounds.startsAt,
        bounds.endsAt,
        now,
        at.toLocaleDateString("en-US", { month: "short", timeZone }),
      );
    });
  }
  if (range === "week")
    return Array.from({ length: 7 }, (_, i) => {
      const at = shiftZonedDay(week.startsAt, i, timeZone);
      const bounds = dailyPeriodBounds(at, timeZone);
      return bucket(
        rows,
        bounds.startsAt,
        bounds.endsAt,
        now,
        at.toLocaleDateString("en-US", { weekday: "short", timeZone }),
      );
    });
  const result: TrainingBucket[] = [];
  let cursor = month.startsAt;
  while (cursor < month.endsAt) {
    const end = new Date(
      Math.min(
        weeklyPeriodBounds(cursor, timeZone).endsAt.getTime(),
        month.endsAt.getTime(),
      ),
    );
    result.push(
      bucket(
        rows,
        cursor,
        end,
        now,
        cursor.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone,
        }),
      ),
    );
    cursor = end;
  }
  return result;
}
export interface TrainingDay extends TrainingBucket { day: string; inMonth: boolean; future: boolean; intensity: number; activityIds: string[] }
/** Monday-first month atlas in the account timezone with padding days. */
export function trainingAtlas(
  activities: Activity[],
  sport: TrainingSportFilter,
  anchor: Date,
  now = new Date(),
  track: ScoreTrack = "open",
  timeZone = APP_TIMEZONE,
): TrainingDay[] {
  const rows = eligible(activities, sport, track, now);
  const month = monthlyPeriodBounds(anchor, timeZone);
  const start = weeklyPeriodBounds(month.startsAt, timeZone).startsAt;
  const cells: TrainingDay[] = [];
  for (
    let at = start;
    at < month.endsAt || cells.length % 7 !== 0;
    at = shiftZonedDay(at, 1, timeZone)
  ) {
    const b = dailyPeriodBounds(at, timeZone);
    const day = dayKey(at, timeZone);
    const data = bucket(
      rows,
      b.startsAt,
      b.endsAt,
      now,
      String(Number(day.slice(-2))),
    );
    cells.push({
      ...data,
      day,
      inMonth: at >= month.startsAt && at < month.endsAt,
      future: day > dayKey(now, timeZone),
      intensity:
        data.movingSec === 0
          ? 0
          : Math.min(4, Math.ceil(data.movingSec / 1800)),
      activityIds: rows
        .filter((a) => dayKey(new Date(a.startedAt), timeZone) === day)
        .map((a) => a.id),
    });
  }
  return cells;
}
export function formatTrainingHours(seconds:number):string { return (Math.max(0,seconds)/3600).toLocaleString("en-US",{maximumFractionDigits:2}); }

/**
 * Earliest chart date: prefers account creation date when provided and valid,
 * otherwise earliest recorded activity, period result, record attempt, effort event, or health reading.
 */
export function earliestDataDate(
  state: CompeteState,
  now = competeNow(state),
  createdAt?: string | null,
): Date | null {
  if (createdAt) {
    const createdMs = Date.parse(createdAt);
    if (Number.isFinite(createdMs) && createdMs <= now.getTime()) {
      return new Date(createdMs);
    }
  }
  let min: number | undefined;
  const consider = (raw: string | undefined) => {
    if (!raw) return;
    const t = Date.parse(raw);
    if (Number.isFinite(t) && t <= now.getTime() && (min === undefined || t < min)) min = t;
  };

  for (const a of state.activities) {
    if (countsForTraining(a)) consider(a.startedAt);
  }
  for (const r of state.periodResults) consider(r.periodStart);
  for (const a of state.recordAttempts ?? []) consider(a.startedAt);
  for (const e of state.effortScoreEvents ?? []) consider(e.occurredAt);
  for (const h of state.dailyHealth ?? []) consider(`${h.day}T12:00:00Z`);
  for (const s of state.sleepNights ?? []) consider(`${s.day}T12:00:00Z`);

  return min !== undefined ? new Date(min) : null;
}

export function trainingRangeNavigation(
  anchor: Date,
  earliest: Date | null,
  now: Date,
  range: TrainingRange,
  timeZone = APP_TIMEZONE,
): { prevAllowed: boolean; nextAllowed: boolean } {
  const nextAllowed =
    range === "year"
      ? dayKey(anchor, timeZone).slice(0, 4) < dayKey(now, timeZone).slice(0, 4)
      : range === "month"
        ? dayKey(anchor, timeZone).slice(0, 7) < dayKey(now, timeZone).slice(0, 7)
        : weeklyPeriodBounds(anchor, timeZone).startsAt.getTime() <
          weeklyPeriodBounds(now, timeZone).startsAt.getTime();

  if (!earliest) {
    return { prevAllowed: false, nextAllowed };
  }

  const prevAllowed =
    range === "year"
      ? dayKey(anchor, timeZone).slice(0, 4) > dayKey(earliest, timeZone).slice(0, 4)
      : range === "month"
        ? dayKey(anchor, timeZone).slice(0, 7) > dayKey(earliest, timeZone).slice(0, 7)
        : weeklyPeriodBounds(anchor, timeZone).startsAt.getTime() >
          weeklyPeriodBounds(earliest, timeZone).startsAt.getTime();

  return { prevAllowed, nextAllowed };
}

export function clampTrainingAnchor(
  anchor: Date,
  earliest: Date | null,
  now: Date,
  range: TrainingRange,
  timeZone = APP_TIMEZONE,
): Date {
  const lowerBound = earliest ?? now;
  if (range === "year") {
    const anchorYear = dayKey(anchor, timeZone).slice(0, 4);
    const earliestYear = dayKey(lowerBound, timeZone).slice(0, 4);
    const nowYear = dayKey(now, timeZone).slice(0, 4);
    if (anchorYear < earliestYear) return lowerBound;
    if (anchorYear > nowYear) return now;
    return anchor;
  }
  if (range === "month") {
    const anchorMonth = dayKey(anchor, timeZone).slice(0, 7);
    const earliestMonth = dayKey(lowerBound, timeZone).slice(0, 7);
    const nowMonth = dayKey(now, timeZone).slice(0, 7);
    if (anchorMonth < earliestMonth) return lowerBound;
    if (anchorMonth > nowMonth) return now;
    return anchor;
  }
  const anchorWeek = weeklyPeriodBounds(anchor, timeZone).startsAt.getTime();
  const earliestWeek = weeklyPeriodBounds(lowerBound, timeZone).startsAt.getTime();
  const nowWeek = weeklyPeriodBounds(now, timeZone).startsAt.getTime();
  if (anchorWeek < earliestWeek) return lowerBound;
  if (anchorWeek > nowWeek) return now;
  return anchor;
}

/** Live score progress toward the next rank threshold. */
export function effortPointProgress(state: CompeteState, sport: SportId = state.primary, track: ScoreTrack = "open", now=competeNow(state)) {
  const live=readAccountEffort(state,sport,now);
  if(live){
    const score=live.liveScore, next=(Math.floor(score/1250)+1)*1250;
    return {sport,track,score,earned:Math.max(0,score-live.settledScore),step:1,volume:0,remaining:next-score,retained:false,fraction:(score%1250)/1250,capped:false,officialRank:live.officialRank,live:true};
  }
  return null;
}

export function sessionStageModel(activities: Activity[]) {
  const rows=[...activities].sort((a,b)=>a.startedAt.localeCompare(b.startedAt));
  return { rows, movingSec:rows.reduce((sum,a)=>sum+Math.max(0,a.movingSec),0), sessions:rows.length };
}

/** Honest full-period comparison; partial selections explicitly say so in the UI. */
export function trainingComparison(
  activities: Activity[],
  sport: TrainingSportFilter,
  range: TrainingRange,
  anchor: Date,
  now = new Date(),
  timeZone = APP_TIMEZONE,
) {
  const current = trainingBuckets(activities, sport, range, anchor, now, "open", timeZone);
  const priorAnchor =
    range === "week"
      ? shiftZonedDay(anchor, -7, timeZone)
      : shiftTrainingMonth(anchor, range === "year" ? -12 : -1, timeZone);
  const previous = trainingBuckets(activities, sport, range, priorAnchor, now, "open", timeZone);
  const sum=(rows:TrainingBucket[])=>rows.reduce((n,b)=>n+b.movingSec,0);
  const total=sum(current),prior=sum(previous),partial=current.some(b=>b.partial);
  const percent=prior>0?(total-prior)/prior*100:null;
  const label=percent===null?`No activity in previous ${range}`:`${percent>0?"↑ ":percent<0?"↓ ":""}${Math.abs(percent).toLocaleString("en-US",{maximumFractionDigits:0})}% vs ${partial?"all of ":""}previous ${range}`;
  return {total,prior,partial,percent,label};
}
