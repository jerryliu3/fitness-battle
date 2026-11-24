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
  return formatActivityRecency(at, now, true) ?? "—";
}

/** Map callout recency; pass `compact` for "+2.1 km • 1h ago" labels. */
export function formatActivityRecency(
  at: string | undefined,
  now: Date = new Date(),
  compact = false,
): string | undefined {
  if (!at) return undefined;
  const elapsed = now.getTime() - Date.parse(at);
  if (!Number.isFinite(elapsed) || elapsed < 0) return undefined;
  const minutes = elapsed / 60000;
  if (minutes < 1) return compact ? "now" : "just now";
  if (minutes < 60) {
    const whole = Math.floor(minutes);
    return compact ? `${whole}m ago` : `${whole} min${whole === 1 ? "" : "s"} ago`;
  }
  const hours = minutes / 60;
  if (hours < 24) {
    const whole = Math.floor(hours);
    return compact ? `${whole}h ago` : `${whole} hour${whole === 1 ? "" : "s"} ago`;
  }
  const whole = Math.floor(hours / 24);
  return compact ? `${whole}d ago` : `${whole} day${whole === 1 ? "" : "s"} ago`;
}

