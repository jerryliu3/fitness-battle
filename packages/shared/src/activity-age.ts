import {
  countsOnTrack,
  type Activity,
  type ScoreTrack,
  type SportId,
} from "./compete";

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
