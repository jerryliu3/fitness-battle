import { APP_TIMEZONE, dailyPeriodBounds, dayKey, monthlyPeriodBounds, shiftAppDay, weeklyPeriodBounds } from "./period";
import { countsOnTrack } from "./compete/ledger";
import { periodEffort } from "./compete/effort";
import { currentEffortMilestone } from "./compete/milestones";
import { competeNow } from "./compete/engine";
import { ELO_CAP, type Activity, type CompeteState, type ScoreTrack, type SportId } from "./compete/sports";

export type TrainingRange = "week" | "month" | "year";
export interface TrainingBucket {
  start: string; end: string; label: string; movingSec: number; sessions: number; distanceM: number; partial: boolean;
}
export function shiftTrainingMonth(anchor: Date, months: number): Date {
  const [year, month] = dayKey(anchor).split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1 + months, 1, 12));
}
function eligible(activities: Activity[], sport: SportId | "all", track: ScoreTrack, now: Date) {
  return activities.filter(a => (sport === "all" || a.sport === sport) && countsOnTrack(a, track) && Number.isFinite(Date.parse(a.startedAt)) && Date.parse(a.startedAt) <= now.getTime());
}
function bucket(rows: Activity[], start: Date, end: Date, now: Date, label: string): TrainingBucket {
  const included = rows.filter(a => Date.parse(a.startedAt) >= start.getTime() && Date.parse(a.startedAt) < end.getTime());
  return { start: start.toISOString(), end: end.toISOString(), label, movingSec: included.reduce((t,a)=>t+Math.max(0,a.movingSec),0), distanceM: included.reduce((t,a)=>t+Math.max(0,a.distanceM),0), sessions: included.length, partial: start <= now && now < end };
}
/** Calendar buckets are Eastern, half-open, and never synthesize activity. Month bars are clipped calendar weeks. */
export function trainingBuckets(activities: Activity[], sport: SportId | "all", range: TrainingRange, anchor: Date, now = new Date(), track: ScoreTrack = "open"): TrainingBucket[] {
  const rows = eligible(activities, sport, track, now);
  const week = weeklyPeriodBounds(anchor), month = monthlyPeriodBounds(anchor);
  if (range === "year") {
    const year = Number(dayKey(anchor).slice(0,4));
    return Array.from({length:12},(_,i)=>{ const at = new Date(Date.UTC(year,i,1,12)); const bounds=monthlyPeriodBounds(at); return bucket(rows,bounds.startsAt,bounds.endsAt,now,at.toLocaleDateString("en-US",{month:"short",timeZone:APP_TIMEZONE})); });
  }
  if (range === "week") return Array.from({length:7},(_,i)=>{ const at=shiftAppDay(week.startsAt,i), bounds=dailyPeriodBounds(at); return bucket(rows,bounds.startsAt,bounds.endsAt,now,at.toLocaleDateString("en-US",{weekday:"short",timeZone:APP_TIMEZONE})); });
  const result: TrainingBucket[]=[];
  let cursor=month.startsAt;
  while(cursor < month.endsAt){ const end=new Date(Math.min(weeklyPeriodBounds(cursor).endsAt.getTime(),month.endsAt.getTime())); result.push(bucket(rows,cursor,end,now,cursor.toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:APP_TIMEZONE}))); cursor=end; }
  return result;
}
export interface TrainingDay extends TrainingBucket { day: string; inMonth: boolean; future: boolean; intensity: number; activityIds: string[] }
/** Monday-first month atlas with padding days and a stable, duration-based intensity scale. */
export function trainingAtlas(activities: Activity[], sport: SportId | "all", anchor: Date, now = new Date(), track: ScoreTrack = "open"): TrainingDay[] {
  const rows=eligible(activities,sport,track,now), month=monthlyPeriodBounds(anchor), start=weeklyPeriodBounds(month.startsAt).startsAt;
  const cells:TrainingDay[]=[];
  for(let at=start; at < month.endsAt || cells.length%7!==0; at=shiftAppDay(at,1)){
    const b=dailyPeriodBounds(at), day=dayKey(at), data=bucket(rows,b.startsAt,b.endsAt,now,String(Number(day.slice(-2))));
    cells.push({...data,day,inMonth:at>=month.startsAt&&at<month.endsAt,future:day>dayKey(now),intensity:data.movingSec===0?0:Math.min(4,Math.ceil(data.movingSec/1800)),activityIds:rows.filter(a=>dayKey(new Date(a.startedAt))===day).map(a=>a.id)});
  }
  return cells;
}
export function formatTrainingHours(seconds:number):string { return (Math.max(0,seconds)/3600).toLocaleString("en-US",{maximumFractionDigits:2}); }

/**
 * Earliest recorded activity, settled period result, or durable personal record attempt.
 * When no historical data is recorded, falls back to `now`.
 */
export function earliestDataDate(state: CompeteState, now = competeNow(state)): Date {
  const timestamps: number[] = [];
  for (const a of state.activities) {
    if (countsOnTrack(a, "open")) {
      const t = Date.parse(a.startedAt);
      if (Number.isFinite(t) && t <= now.getTime()) timestamps.push(t);
    }
  }
  for (const r of state.periodResults) {
    const t = Date.parse(r.periodStart);
    if (Number.isFinite(t) && t <= now.getTime()) timestamps.push(t);
  }
  for (const a of state.recordAttempts ?? []) {
    const t = Date.parse(a.startedAt);
    if (Number.isFinite(t) && t <= now.getTime()) timestamps.push(t);
  }
  return timestamps.length ? new Date(Math.min(...timestamps)) : now;
}

export function trainingRangeNavigation(
  anchor: Date,
  earliest: Date,
  now: Date,
  range: TrainingRange,
): { prevAllowed: boolean; nextAllowed: boolean } {
  const next =
    range === "week"
      ? shiftAppDay(anchor, 7)
      : shiftTrainingMonth(anchor, range === "year" ? 12 : 1);

  const nextAllowed =
    range === "year"
      ? dayKey(next).slice(0, 4) <= dayKey(now).slice(0, 4)
      : range === "month"
        ? dayKey(next).slice(0, 7) <= dayKey(now).slice(0, 7)
        : weeklyPeriodBounds(next).startsAt.getTime() <= now.getTime();

  const prevAllowed =
    range === "year"
      ? dayKey(anchor).slice(0, 4) > dayKey(earliest).slice(0, 4)
      : range === "month"
        ? dayKey(anchor).slice(0, 7) > dayKey(earliest).slice(0, 7)
        : weeklyPeriodBounds(anchor).startsAt.getTime() >
          weeklyPeriodBounds(earliest).startsAt.getTime();

  return { prevAllowed, nextAllowed };
}

export function clampTrainingAnchor(
  anchor: Date,
  earliest: Date,
  now: Date,
  range: TrainingRange,
): Date {
  if (range === "year") {
    const anchorYear = dayKey(anchor).slice(0, 4);
    const earliestYear = dayKey(earliest).slice(0, 4);
    const nowYear = dayKey(now).slice(0, 4);
    if (anchorYear < earliestYear) return earliest;
    if (anchorYear > nowYear) return now;
    return anchor;
  }
  if (range === "month") {
    const anchorMonth = dayKey(anchor).slice(0, 7);
    const earliestMonth = dayKey(earliest).slice(0, 7);
    const nowMonth = dayKey(now).slice(0, 7);
    if (anchorMonth < earliestMonth) return earliest;
    if (anchorMonth > nowMonth) return now;
    return anchor;
  }
  const anchorWeek = weeklyPeriodBounds(anchor).startsAt.getTime();
  const earliestWeek = weeklyPeriodBounds(earliest).startsAt.getTime();
  const nowWeek = weeklyPeriodBounds(now).startsAt.getTime();
  if (anchorWeek < earliestWeek) return earliest;
  if (anchorWeek > nowWeek) return now;
  return anchor;
}

/** Presentation of the existing +1 receipt rule; high-water awards are never reassigned to a particular session. */
export function effortPointProgress(state: CompeteState, sport: SportId = state.primary, track: ScoreTrack = "open", now=competeNow(state)) {
  const rating=state.ratings.find(r=>r.sport===sport), enrollment=state.enrollments.find(e=>e.sport===sport);
  const receipt=currentEffortMilestone(state,sport,track);
  if(!rating?.optedIn || !enrollment || !receipt || Date.parse(enrollment.waveStart)>now.getTime() || Date.parse(enrollment.weekEnd)<=now.getTime())return null;
  const totals=periodEffort(state.activities,sport,new Date(enrollment.waveStart),new Date(Math.min(Date.parse(enrollment.weekEnd),now.getTime()+1)),track);
  const volume=sport==="strength"?totals.movingSec:totals.distanceM;
  const score=track==="open"?rating.openElo:rating.verifiedElo;
  const threshold=(receipt.earned+1)*receipt.step;
  return {sport,track,score,earned:receipt.earned,step:receipt.step,volume,remaining:Math.max(0,threshold-volume),retained:volume<receipt.earned*receipt.step,fraction:score>=ELO_CAP?1:Math.max(0,Math.min(1,(volume-receipt.earned*receipt.step)/receipt.step)),capped:score>=ELO_CAP};
}

export function sessionStageModel(activities: Activity[]) {
  const rows=[...activities].sort((a,b)=>a.startedAt.localeCompare(b.startedAt));
  return { rows, movingSec:rows.reduce((sum,a)=>sum+Math.max(0,a.movingSec),0), sessions:rows.length };
}

/** Honest full-period comparison; partial selections explicitly say so in the UI. */
export function trainingComparison(activities: Activity[], sport: SportId | "all", range: TrainingRange, anchor: Date, now = new Date()) {
  const current=trainingBuckets(activities,sport,range,anchor,now);
  const priorAnchor=range==="week"?shiftAppDay(anchor,-7):shiftTrainingMonth(anchor,range==="year"?-12:-1);
  const previous=trainingBuckets(activities,sport,range,priorAnchor,now);
  const sum=(rows:TrainingBucket[])=>rows.reduce((n,b)=>n+b.movingSec,0);
  const total=sum(current),prior=sum(previous),partial=current.some(b=>b.partial);
  const percent=prior>0?(total-prior)/prior*100:null;
  const label=percent===null?`No activity in previous ${range}`:`${percent>0?"↑ ":percent<0?"↓ ":""}${Math.abs(percent).toLocaleString("en-US",{maximumFractionDigits:0})}% vs ${partial?"all of ":""}previous ${range}`;
  return {total,prior,partial,percent,label};
}
