import type { ActivitySample } from "../types";
import { sportById, type Activity } from "../compete/sports";

/** Turn a tracker sample into a compete activity. Unmapped providers are skipped. */
export function activityFromSample(sample: ActivitySample): Activity | null {
  if (sample.provider !== "strava") return null;
  const sport = sportById(sample.categorySlug);
  const movingSec = Math.max(0, sample.movingSec ?? (sport.gps ? 0 : sample.metricValue));
  const distanceM = sport.gps ? Math.max(0, sample.metricValue) : 0;
  if (!sample.startedAt || Number.isNaN(new Date(sample.startedAt).getTime())) {
    return null;
  }
  return {
    id: sample.id,
    sport: sample.categorySlug,
    startedAt: sample.startedAt,
    distanceM,
    movingSec,
    avgHr: sample.avgHr ?? null,
    verified: sport.gps,
    source: "strava",
  };
}
