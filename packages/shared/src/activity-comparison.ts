import { countsOnTrack } from "./compete/ledger";
import { formatClockTime } from "./compete/pace";
import { sportById, type Activity, type UnitSystem } from "./compete/sports";

export interface ActivityComparison {
  id: "time" | "distance" | "pace" | "heart-rate" | "frequency";
  label: string;
  current: number;
  baseline: number;
  currentLabel: string;
  baselineLabel: string;
  context: string;
}

const MIN_HISTORY = 3;
const HISTORY_LIMIT = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function valid(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Compare one counted session with only earlier, counted sessions of the same sport. */
export function activityComparisons(
  activity: Activity,
  activities: readonly Activity[],
  units: UnitSystem,
  now: Date,
): ActivityComparison[] {
  const at = Date.parse(activity.startedAt);
  if (!countsOnTrack(activity, "open") || !valid(activity.movingSec) || !Number.isFinite(at) || !Number.isFinite(now.getTime()) || at > now.getTime()) return [];

  const prior = activities
    .filter(row => row.id !== activity.id && row.sport === activity.sport && countsOnTrack(row, "open") && valid(row.movingSec) && Number.isFinite(Date.parse(row.startedAt)) && Date.parse(row.startedAt) < at)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const recent = prior.slice(0, HISTORY_LIMIT);
  const comparisons: ActivityComparison[] = [];
  const typical = (id: ActivityComparison["id"], label: string, current: number | null | undefined, rows: Activity[], getValue: (a: Activity) => number | null | undefined, format: (value: number) => string, qualifier = "") => {
    if (!valid(current)) return;
    const values = rows.map(getValue).filter(valid);
    if (values.length < MIN_HISTORY) return;
    const baseline = median(values);
    comparisons.push({ id, label, current, baseline, currentLabel: format(current), baselineLabel: format(baseline), context: `Median of ${values.length} previous ${sportById(activity.sport).name.toLowerCase()} sessions${qualifier}.` });
  };

  typical("time", "Moving time", activity.movingSec, recent, row => row.movingSec, formatClockTime);
  if (sportById(activity.sport).gps) {
    const divisor = units === "metric" ? 1000 : 1609.344;
    const unit = units === "metric" ? "km" : "mi";
    typical("distance", "Distance", activity.distanceM, recent, row => row.distanceM, value => `${(value / divisor).toFixed(1)} ${unit}`);
    if (valid(activity.distanceM) && activity.distanceM >= 500 && valid(activity.movingSec)) {
      const comparable = prior.filter(row => valid(row.distanceM) && row.distanceM >= 500 && Math.abs(row.distanceM - activity.distanceM) <= activity.distanceM * 0.2).slice(0, HISTORY_LIMIT);
      typical("pace", activity.sport === "cycling" ? "Time / distance" : "Pace", activity.movingSec / activity.distanceM * divisor, comparable,
        row => valid(row.movingSec) && valid(row.distanceM) ? row.movingSec / row.distanceM * divisor : null,
        value => `${formatClockTime(value)}/${unit}`, " within 20% of this distance");
    }
  } else {
    const recentWindow = prior.filter(row => Date.parse(row.startedAt) >= at - 30 * DAY_MS).length + 1;
    const previousWindow = prior.filter(row => Date.parse(row.startedAt) >= at - 60 * DAY_MS && Date.parse(row.startedAt) < at - 30 * DAY_MS).length;
    if (recent.length >= MIN_HISTORY) comparisons.push({
      id: "frequency", label: "Sessions", current: recentWindow, baseline: previousWindow,
      currentLabel: `${recentWindow}`, baselineLabel: `${previousWindow}`,
      context: "Same sport: 30 days ending with this session vs the previous 30 days.",
    });
    const validHr = (value: number | null | undefined) => valid(value) && value >= 20 && value <= 260 ? value : null;
    typical("heart-rate", "Avg heart rate", validHr(activity.avgHr), recent, row => validHr(row.avgHr),
      value => `${Math.round(value)} bpm`);
  }
  return comparisons.slice(0, 3);
}
