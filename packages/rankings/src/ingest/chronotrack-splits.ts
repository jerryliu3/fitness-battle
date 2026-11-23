import { CHECKPOINT_PROFILES, normalizeCheckpointLabel, type MarathonCheckpointProfile } from "./checkpoint-profiles";
import type { ParsedMikaSplits } from "./mikatiming-splits";

export type ChronotrackInterval = {
  chipTimeInMillis: number | null;
  distance?: { metersFromStart?: number | null; meters?: number | null } | null;
  name?: string | null;
  type?: string | null;
  full?: boolean;
};

function labelMatches(candidate: string, accepted: readonly string[]): boolean {
  const normalized = normalizeCheckpointLabel(candidate).toLowerCase();
  return accepted.some((entry) => normalizeCheckpointLabel(entry).toLowerCase() === normalized);
}

function alignIntervalsToProfile(
  intervals: ChronotrackInterval[],
  profile: MarathonCheckpointProfile,
): ParsedMikaSplits {
  const course = intervals.filter(
    (row) =>
      row.chipTimeInMillis != null &&
      row.chipTimeInMillis > 0 &&
      row.type !== "split" &&
      row.distance?.metersFromStart != null,
  );

  const elapsedMs: (number | null)[] = profile.distancesM.map(() => null);
  const sourceLabels: string[] = profile.distancesM.map(() => "");

  for (let i = 0; i < profile.distancesM.length; i += 1) {
    const accepted = profile.labelAliases[i] ?? [profile.labels[i]];
    const targetM = profile.distancesM[i];
    const match =
      course.find((row) => {
        const label = row.name ?? "";
        if (label && labelMatches(label, accepted)) return true;
        const meters = row.distance?.metersFromStart ?? row.distance?.meters;
        return meters != null && Math.abs(meters - targetM) < 2;
      }) ?? null;
    if (match?.chipTimeInMillis != null) {
      elapsedMs[i] = match.chipTimeInMillis;
      sourceLabels[i] = match.name?.trim() || profile.labels[i];
    }
  }

  return { profileId: profile.id, elapsedMs, sourceLabels };
}

/** Map AZP entry/result intervals onto a marathon checkpoint profile. */
export function chronotrackSplitsForProfile(
  payload: unknown,
  profileId: keyof typeof CHECKPOINT_PROFILES | string,
): ParsedMikaSplits {
  const profile = CHECKPOINT_PROFILES[profileId];
  if (!profile) throw new Error(`Unknown checkpoint profile ${profileId}.`);
  const intervals =
    (payload as { result?: { intervals?: ChronotrackInterval[] }; intervals?: ChronotrackInterval[] })?.result
      ?.intervals ??
    (payload as { intervals?: ChronotrackInterval[] })?.intervals ??
    (payload as { result?: ChronotrackInterval[] })?.result ??
    [];
  if (!intervals.length) throw new Error("No split intervals on ChronoTrack result.");
  return alignIntervalsToProfile(intervals, profile);
}