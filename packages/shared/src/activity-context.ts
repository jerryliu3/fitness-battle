import { countsOnTrack } from "./compete/ledger";
import { formatClockTime } from "./compete/pace";
import { sportById, type Activity, type UnitSystem } from "./compete/sports";
import { APP_TIMEZONE, dayKey, shiftAppDay } from "./period";

export type ActivityContextMetric = "pace" | "time" | "hr" | "efficiency";
export interface ActivityContextObservation { activity: Activity; time: number; value: number; average: number | null }
export interface ActivityContextDailyVolume { date: Date; key: string; minutes: number; without: number; average: number; averageWithout: number }
export const activityContextDateLabel = (date: Date | string) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE });
export const activityContextMean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
export const activityContextPositive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
export const activityContextRecordedHr = (activity: Activity) => activityContextPositive(activity.avgHr) && activity.avgHr >= 20 && activity.avgHr <= 260 ? activity.avgHr : null;

export function activityContextMetricValue(activity: Activity, metric: ActivityContextMetric, units: UnitSystem): number | null {
  if (metric === "efficiency") {
    const hr = activityContextRecordedHr(activity);
    return sportById(activity.sport).gps && activityContextPositive(activity.distanceM) && activity.distanceM >= 500 && activityContextPositive(activity.movingSec) && hr !== null
      ? activity.distanceM / (activity.movingSec / 60) / hr : null;
  }
  if (metric === "hr") return activityContextRecordedHr(activity);
  if (!activityContextPositive(activity.movingSec)) return null;
  if (metric === "time") return activity.movingSec / 60;
  return sportById(activity.sport).gps && activityContextPositive(activity.distanceM) && activity.distanceM >= 500
    ? activity.movingSec / activity.distanceM * (units === "metric" ? 1000 : 1609.344) : null;
}

export function activityContextFormatMetric(value: number, metric: ActivityContextMetric, units: UnitSystem): string {
  if (metric === "efficiency") return `${value.toFixed(1)}`;
  if (metric === "pace") return `${formatClockTime(value)}/${units === "metric" ? "km" : "mi"}`;
  return `${Number(value.toFixed(1))} ${metric === "time" ? "min" : "bpm"}`;
}

/** Earlier counted same-sport history, deduplicated and bounded by the selected session. */
export function activityContextSessionHistory(current: Activity, activities: readonly Activity[], now: Date) {
  const at = Date.parse(current.startedAt);
  if (!Number.isFinite(now.getTime()) || at > now.getTime() || !countsOnTrack(current, "open") || !Number.isFinite(at) || !activityContextPositive(current.movingSec)) return [];
  const seen = new Set<string>();
  return [...activities.filter(row => row.id !== current.id), current].filter(row => {
    const time = Date.parse(row.startedAt);
    if (seen.has(row.id) || row.sport !== current.sport || !countsOnTrack(row, "open") || !activityContextPositive(row.movingSec) || !Number.isFinite(time) || (row.id !== current.id && time >= at)) return false;
    seen.add(row.id);
    return true;
  }).sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
}

export function activityContextMatchedRows(current: Activity, history: Activity[], metric: ActivityContextMetric) {
  return history.filter(row => (metric !== "pace" && metric !== "efficiency") || (activityContextPositive(row.distanceM) && activityContextPositive(current.distanceM) && Math.abs(row.distanceM - current.distanceM) <= current.distanceM * .2));
}

/** Fixed prior-session baseline: the selected session never moves the denominator. */
export function activityContextEfficiencyBaseline(current: Activity, history: Activity[], units: UnitSystem): number | null {
  const prior = activityContextMatchedRows(current, history, "efficiency").filter(row => row.id !== current.id && Date.parse(row.startedAt) >= Date.parse(current.startedAt) - 90 * 86400000)
    .map(row => activityContextMetricValue(row, "efficiency", units)).filter((value): value is number => value !== null).sort((a, b) => a - b);
  if (prior.length < 3) return null;
  const middle = Math.floor(prior.length / 2);
  return prior.length % 2 ? prior[middle]! : (prior[middle - 1]! + prior[middle]!) / 2;
}

export function activityContextTrajectory(current: Activity, history: Activity[], metric: ActivityContextMetric, units: UnitSystem): ActivityContextObservation[] {
  const baseline = metric === "efficiency" ? activityContextEfficiencyBaseline(current, history, units) : 1;
  if (baseline === null) return [];
  const all = activityContextMatchedRows(current, history, metric).flatMap(activity => {
    const value = activityContextMetricValue(activity, metric, units);
    return value === null ? [] : [{ activity, time: Date.parse(activity.startedAt), value: metric === "efficiency" ? value / baseline * 100 : value }];
  });
  return all.map((point, index) => ({ ...point, average: index >= 4 ? activityContextMean(all.slice(index - 4, index + 1).map(row => row.value)) : null })).slice(-16);
}

export function activityContextConstellation(current: Activity, history: Activity[], units: UnitSystem) {
  const metric = sportById(current.sport).gps ? "pace" : "time";
  return activityContextMatchedRows(current, history, metric).filter(row => Date.parse(row.startedAt) >= Date.parse(current.startedAt) - 90 * 86400000).flatMap(activity => {
    const y = activityContextMetricValue(activity, metric, units), x = activityContextRecordedHr(activity);
    return y === null || x === null ? [] : [{ activity, x, y }];
  }).slice(-60);
}

/** Least-squares description of prior observations, never a forecast or a fitness score. */
export function activityContextFitHistory(points: { x: number; y: number; activity: Activity }[], currentId: string) {
  const prior = points.filter(point => point.activity.id !== currentId);
  if (prior.length < 5) return null;
  const xMean = activityContextMean(prior.map(point => point.x)), yMean = activityContextMean(prior.map(point => point.y));
  const variance = prior.reduce((sum, point) => sum + (point.x - xMean) ** 2, 0);
  if (variance === 0) return null;
  const slope = prior.reduce((sum, point) => sum + (point.x - xMean) * (point.y - yMean), 0) / variance;
  return { slope, intercept: yMean - slope * xMean, min: Math.min(...prior.map(p => p.x)), max: Math.max(...prior.map(p => p.x)), count: prior.length };
}

export function activityContextVolumeHistory(current: Activity, history: Activity[]): ActivityContextDailyVolume[] {
  const anchor = new Date(current.startedAt), currentId = current.id;
  const totals = new Map<string, { minutes: number; without: number }>();
  for (const row of history) {
    const key = dayKey(new Date(row.startedAt));
    const day = totals.get(key) ?? { minutes: 0, without: 0 };
    day.minutes += row.movingSec / 60;
    if (row.id !== currentId) day.without += row.movingSec / 60;
    totals.set(key, day);
  }
  const minutes = (at: Date, without: boolean) => {
    const day = totals.get(dayKey(at));
    return day ? without ? day.without : day.minutes : 0;
  };
  return Array.from({ length: 28 }, (_, index) => {
    const date = shiftAppDay(anchor, index - 27);
    return { date, key: dayKey(date), minutes: minutes(date, false), without: minutes(date, true),
      average: activityContextMean(Array.from({ length: 7 }, (_, offset) => minutes(shiftAppDay(date, -offset), false))),
      averageWithout: activityContextMean(Array.from({ length: 7 }, (_, offset) => minutes(shiftAppDay(date, -offset), true))) };
  });
}
