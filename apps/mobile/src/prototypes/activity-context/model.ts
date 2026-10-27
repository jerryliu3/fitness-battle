import { APP_TIMEZONE, countsOnTrack, dailyPeriodBounds, dayKey, formatClockTime, shiftAppDay, sportById, type Activity, type UnitSystem } from "@fitness-battle/shared";

export type Metric = "pace" | "time" | "hr";
export interface Observation { activity: Activity; time: number; value: number; average: number | null }
export interface DailyVolume { date: Date; key: string; minutes: number; without: number; average: number; averageWithout: number }
export const studyNow = new Date("2026-10-27T18:00:00Z");
export const dateLabel = (date: Date | string) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE });
export const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
export const positive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
export const recordedHr = (activity: Activity) => positive(activity.avgHr) && activity.avgHr >= 20 && activity.avgHr <= 260 ? activity.avgHr : null;

export function metricValue(activity: Activity, metric: Metric, units: UnitSystem): number | null {
  if (metric === "hr") return recordedHr(activity);
  if (!positive(activity.movingSec)) return null;
  if (metric === "time") return activity.movingSec / 60;
  return sportById(activity.sport).gps && positive(activity.distanceM) && activity.distanceM >= 500
    ? activity.movingSec / activity.distanceM * (units === "metric" ? 1000 : 1609.344) : null;
}

export function formatMetric(value: number, metric: Metric, units: UnitSystem): string {
  if (metric === "pace") return `${formatClockTime(value)}/${units === "metric" ? "km" : "mi"}`;
  return `${Number(value.toFixed(1))} ${metric === "time" ? "min" : "bpm"}`;
}

/** All study calculations take actual rows; fictional data is isolated in example(). */
export function sessionHistory(current: Activity, activities: readonly Activity[]) {
  const at = Date.parse(current.startedAt);
  if (!countsOnTrack(current, "open") || !Number.isFinite(at) || !positive(current.movingSec)) return [];
  const seen = new Set<string>();
  return [...activities.filter(row => row.id !== current.id), current].filter(row => {
    const time = Date.parse(row.startedAt);
    if (seen.has(row.id) || row.sport !== current.sport || !countsOnTrack(row, "open") || !positive(row.movingSec) || !Number.isFinite(time) || (row.id !== current.id && time >= at)) return false;
    seen.add(row.id);
    return true;
  }).sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
}

export function matchedRows(current: Activity, history: Activity[], metric: Metric) {
  return history.filter(row => metric !== "pace" || (positive(row.distanceM) && positive(current.distanceM) && Math.abs(row.distanceM - current.distanceM) <= current.distanceM * .2));
}

export function trajectory(current: Activity, history: Activity[], metric: Metric, units: UnitSystem): Observation[] {
  const all = matchedRows(current, history, metric).flatMap(activity => {
    const value = metricValue(activity, metric, units);
    return value === null ? [] : [{ activity, time: Date.parse(activity.startedAt), value }];
  });
  return all.map((point, index) => ({ ...point, average: index >= 4 ? mean(all.slice(index - 4, index + 1).map(row => row.value)) : null })).slice(-16);
}

export function constellation(current: Activity, history: Activity[], units: UnitSystem) {
  const metric = sportById(current.sport).gps ? "pace" : "time";
  return matchedRows(current, history, metric).filter(row => Date.parse(row.startedAt) >= Date.parse(current.startedAt) - 90 * 86400000).flatMap(activity => {
    const y = metricValue(activity, metric, units), x = recordedHr(activity);
    return y === null || x === null ? [] : [{ activity, x, y }];
  }).slice(-60);
}

/** Least-squares description of prior observations, never a forecast or a fitness score. */
export function fitHistory(points: { x: number; y: number; activity: Activity }[], currentId: string) {
  const prior = points.filter(point => point.activity.id !== currentId);
  if (prior.length < 5) return null;
  const xMean = mean(prior.map(point => point.x)), yMean = mean(prior.map(point => point.y));
  const variance = prior.reduce((sum, point) => sum + (point.x - xMean) ** 2, 0);
  if (variance === 0) return null;
  const slope = prior.reduce((sum, point) => sum + (point.x - xMean) * (point.y - yMean), 0) / variance;
  return { slope, intercept: yMean - slope * xMean, min: Math.min(...prior.map(p => p.x)), max: Math.max(...prior.map(p => p.x)), count: prior.length };
}

export function volumeHistory(current: Activity, history: Activity[]): DailyVolume[] {
  const anchor = new Date(current.startedAt), currentId = current.id;
  const minutes = (at: Date, without: boolean) => {
    const bounds = dailyPeriodBounds(at);
    return history.filter(row => (!without || row.id !== currentId) && Date.parse(row.startedAt) >= bounds.startsAt.getTime() && Date.parse(row.startedAt) < bounds.endsAt.getTime()).reduce((total, row) => total + row.movingSec / 60, 0);
  };
  return Array.from({ length: 28 }, (_, index) => {
    const date = shiftAppDay(anchor, index - 27);
    return { date, key: dayKey(date), minutes: minutes(date, false), without: minutes(date, true),
      average: mean(Array.from({ length: 7 }, (_, offset) => minutes(shiftAppDay(date, -offset), false))),
      averageWithout: mean(Array.from({ length: 7 }, (_, offset) => minutes(shiftAppDay(date, -offset), true))) };
  });
}

export type Example = "run" | "strength" | "no-hr" | "sparse";
export function example(kind: Example): { current: Activity; history: Activity[]; units: UnitSystem } {
  const strength = kind === "strength";
  const history: Activity[] = Array.from({ length: kind === "sparse" ? 3 : 24 }, (_, index) => {
    const daysAgo = (23 - index) * 2 + (index % 3 === 0 ? 1 : 0) + 2;
    const date = shiftAppDay(studyNow, -daysAgo);
    const distanceM = 7900 + (index % 5) * 110;
    const avgHr = kind === "no-hr" ? null : strength ? 112 + (index * 7 % 30) : 132 + (index * 11 % 28);
    const paceSecPerMi = 565 + ((avgHr ?? 145) - 145) * -2.1 - index * 1.3 + [14, -12, 9, -7, 2][index % 5]!;
    return { id: `study-${index}`, sport: strength ? "strength" : "running", startedAt: date.toISOString(),
      distanceM: strength ? 0 : distanceM,
      movingSec: strength ? (32 + index % 7 * 3) * 60 : Math.round(distanceM / 1609.344 * paceSecPerMi),
      avgHr, source: strength ? "manual" : "strava", provenance: strength ? "manual" : "recorded", verified: !strength };
  });
  const current: Activity = { id: "study-current", sport: strength ? "strength" : "running", startedAt: studyNow.toISOString(), distanceM: strength ? 0 : 8200, movingSec: 2640, avgHr: kind === "no-hr" ? null : strength ? 131 : 144, source: strength ? "manual" : "strava", provenance: strength ? "manual" : "recorded", verified: !strength };
  return { current, history: [...history, current], units: "us" };
}
