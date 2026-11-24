import { countsOnTrack } from "./compete/ledger";
import { activityCompetitionVolume } from "./compete/effort";
import { competeVolumeFromTotals } from "./compete-field-view";
import type { Activity, CompeteState, ScoreTrack, SportId } from "./compete/sports";

/** Only report an update when an actual counted activity timestamp is available. */
export function latestCountedActivityAt(
  activities: readonly Activity[],
  sport: SportId,
  track: ScoreTrack,
  start: Date,
  end: Date,
  now: Date,
): string | undefined {
  let latest: number | undefined;
  for (const activity of activities) {
    const at = Date.parse(activity.startedAt);
    if (
      activity.sport !== sport ||
      !countsOnTrack(activity, track) ||
      !Number.isFinite(at) ||
      at < start.getTime() ||
      at >= end.getTime() ||
      at > now.getTime()
    )
      continue;
    if (latest === undefined || at > latest) latest = at;
  }
  return latest === undefined ? undefined : new Date(latest).toISOString();
}

/** Latest counted activity in the period with its competition volume for cards. */
export function latestCountedActivitySnapshot(
  activities: readonly Activity[],
  sport: SportId,
  track: ScoreTrack,
  start: Date,
  end: Date,
  now: Date,
  units: CompeteState["units"],
): { at: string; volume: number } | undefined {
  let best: Activity | undefined;
  let bestAt = -Infinity;
  for (const activity of activities) {
    const at = Date.parse(activity.startedAt);
    if (
      activity.sport !== sport ||
      !countsOnTrack(activity, track) ||
      !Number.isFinite(at) ||
      at < start.getTime() ||
      at >= end.getTime() ||
      at > now.getTime()
    )
      continue;
    if (at > bestAt) {
      bestAt = at;
      best = activity;
    }
  }
  if (!best) return undefined;
  const volume = competeVolumeFromTotals(
    sport,
    {
      effort: activityCompetitionVolume(best),
      distanceM: best.distanceM,
      movingSec: best.movingSec,
    },
    units,
  );
  return volume > 0 ? { at: best.startedAt, volume } : undefined;
}

/** True when the timestamp is within the past hour (live field window). */
export function isActivityLive(
  at: string | undefined,
  now: Date = new Date(),
): boolean {
  if (!at) return false;
  const elapsed = now.getTime() - Date.parse(at);
  return Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 3_600_000;
}

export function formatActivityAge(
  at: string | undefined,
  now: Date = new Date(),
): string {
  if (!at) return "—";
  const elapsed = now.getTime() - Date.parse(at);
  if (!Number.isFinite(elapsed) || elapsed < 0) return "—";
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

/** Long-form recency for map player cards (minutes → hours → days). */
export function formatActivityRecency(
  at: string | undefined,
  now: Date = new Date(),
): string | undefined {
  if (!at) return undefined;
  const elapsed = now.getTime() - Date.parse(at);
  if (!Number.isFinite(elapsed) || elapsed < 0) return undefined;
  const minutes = elapsed / 60000;
  if (minutes < 1) return "just now";
  if (minutes < 60) {
    const whole = Math.floor(minutes);
    return `${whole} min${whole === 1 ? "" : "s"} ago`;
  }
  const hours = minutes / 60;
  if (hours < 24) {
    const whole = Math.floor(hours);
    return `${whole} hour${whole === 1 ? "" : "s"} ago`;
  }
  const days = hours / 24;
  const whole = Math.floor(days);
  return `${whole} day${whole === 1 ? "" : "s"} ago`;
}
