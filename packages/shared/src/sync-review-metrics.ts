import { clubDuration } from "./club-summary";
import { formatVolume } from "./compete/engine";
import { countsOnTrack } from "./compete/ledger";
import { sportById, type Activity, type UnitSystem } from "./compete/sports";

export interface SyncReviewMetric {
  id: "distance" | "duration" | "heart-rate" | "elevation";
  label: string;
  valueLabel: string;
  fraction: number | null;
  comparisonLabel: string;
}

/** Presentation only: magnitude against the largest metric in recent same-sport sessions. */
export function syncReviewMetrics(activity: Activity, activities: readonly Activity[], units: UnitSystem): SyncReviewMetric[] {
  const at = Date.parse(activity.startedAt);
  const seen = new Set([activity.id]);
  const recent = activities.filter(row => {
    const time = Date.parse(row.startedAt);
    if (!Number.isFinite(at) || seen.has(row.id) || row.sport !== activity.sport || !countsOnTrack(row, "open") || !Number.isFinite(time) || time >= at || time < at - 90 * 86400000) return false;
    seen.add(row.id);
    return true;
  }).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)).slice(0, 10);
  const metric = (id: SyncReviewMetric["id"], label: string, value: number | null | undefined, valueLabel: string, read: (row: Activity) => number | null | undefined): SyncReviewMetric[] => {
    if (value == null || !Number.isFinite(value) || value < 0) return [];
    const values = recent.map(read).filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0);
    const relative = values.length ? value / Math.max(...values) : null;
    const fraction = relative === null ? null : Math.min(1, relative);
    return [{ id, label, valueLabel, fraction, comparisonLabel: fraction === null ? "No recent comparison" : `${Math.round((relative ?? 0) * 100)}% of your recent maximum` }];
  };
  return [
    ...(sportById(activity.sport).gps ? metric("distance", "Distance", activity.distanceM, formatVolume(activity.sport, activity.distanceM, activity.movingSec, units), row => row.distanceM) : []),
    ...metric("duration", "Moving time", activity.movingSec, clubDuration(activity.movingSec), row => row.movingSec),
    ...(activity.avgHr != null && activity.avgHr >= 20 && activity.avgHr <= 260 ? metric("heart-rate", "Avg heart rate", activity.avgHr, `${Math.round(activity.avgHr)} bpm`, row => row.avgHr != null && row.avgHr >= 20 && row.avgHr <= 260 ? row.avgHr : null) : []),
    ...metric("elevation", "Elevation gain", activity.elevationGainM, `${Math.round((activity.elevationGainM ?? 0) * (units === "metric" ? 1 : 3.28084))} ${units === "metric" ? "m" : "ft"}`, row => row.elevationGainM),
  ];
}
