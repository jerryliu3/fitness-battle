import type { ActivityProvenance } from "../compete/ledger";
import type { ActivitySample } from "../types";
import { sportById, type Activity } from "../compete/sports";

const COMPETE_SOURCES = new Set<Activity["source"]>([
  "strava",
  "garmin",
  "apple_health",
  "google_health",
  "whoop",
  "oura",
]);

/** Turn a tracker sample into a compete activity. Mock rows are not scored. */
export function activityFromSample(
  sample: ActivitySample,
  provenance: ActivityProvenance = "recorded",
): Activity | null {
  if (!COMPETE_SOURCES.has(sample.provider as Activity["source"])) return null;
  const sport = sportById(sample.categorySlug);
  const movingSec = Math.max(0, sample.movingSec ?? (sport.gps ? 0 : sample.metricValue));
  const distanceM = sport.gps ? Math.max(0, sample.metricValue) : 0;
  if (!sample.startedAt || Number.isNaN(new Date(sample.startedAt).getTime())) {
    return null;
  }
  const isDemo = provenance === "demo";
  const recorded = provenance === "recorded";
  return {
    id: sample.id,
    sport: sample.categorySlug,
    startedAt: sample.startedAt,
    distanceM,
    movingSec,
    avgHr: sample.avgHr ?? null,
    verified: !isDemo && recorded && sport.gps,
    source: sample.provider as Activity["source"],
    provenance,
    disposition: isDemo ? "excluded" : provenance === "imported" ? "pending" : "counted",
    dispositionReason: isDemo
      ? "Sample tracker data does not count."
      : provenance === "imported"
        ? "File import is pending until you count it."
        : undefined,
  };
}
