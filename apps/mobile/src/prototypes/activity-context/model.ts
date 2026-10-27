import { DEFAULT_SAMPLE_ROUTE, shiftAppDay, type Activity, type UnitSystem } from "@fitness-battle/shared";
export { type ActivityContextMetric as Metric, type ActivityContextObservation as Observation, type ActivityContextDailyVolume as DailyVolume, activityContextDateLabel as dateLabel, activityContextMean as mean, activityContextPositive as positive, activityContextRecordedHr as recordedHr, activityContextMetricValue as metricValue, activityContextFormatMetric as formatMetric, activityContextSessionHistory as sessionHistory, activityContextMatchedRows as matchedRows, activityContextTrajectory as trajectory, activityContextConstellation as constellation, activityContextFitHistory as fitHistory, activityContextVolumeHistory as volumeHistory, activityContextEfficiencyBaseline as efficiencyBaseline } from "@fitness-battle/shared";
export const studyNow = new Date("2026-10-27T18:00:00Z");

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
  const current: Activity = { summaryPolyline: strength ? undefined : DEFAULT_SAMPLE_ROUTE?.summaryPolyline, id: "study-current", sport: strength ? "strength" : "running", startedAt: studyNow.toISOString(), distanceM: strength ? 0 : 8200, movingSec: 2640, avgHr: kind === "no-hr" ? null : strength ? 131 : 144, source: strength ? "manual" : "strava", provenance: strength ? "manual" : "recorded", verified: !strength };
  return { current, history: [...history, current], units: "us" };
}
