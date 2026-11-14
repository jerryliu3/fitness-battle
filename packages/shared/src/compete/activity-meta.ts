import { sportById, type Activity, type SportId } from "./sports";

/** How a session entered the product. Demo rows are never a live tracker pull. */
export type ActivityProvenance = "recorded" | "imported" | "manual" | "demo";

/** Whether the session changes this week's score. */
export type ActivityDisposition = "counted" | "pending" | "excluded";

const PRECEDENCE: Record<ActivityProvenance, number> = {
  recorded: 4,
  imported: 3,
  manual: 2,
  demo: 1,
};

export function provenanceOf(activity: Activity): ActivityProvenance {
  if (activity.provenance) return activity.provenance;
  if (activity.source === "history") return "demo";
  return "recorded";
}

const SAMPLE_ID_PREFIXES = [
  "strava-stub-",
  "garmin-stub-",
  "whoop-stub-",
  "oura-stub-",
  "mock-",
];

export function isSampleActivityId(id: string): boolean {
  return SAMPLE_ID_PREFIXES.some((prefix) => id.startsWith(prefix));
}

/** Calibration rows predate provenance and must not score or be shared. */
export function isSampleActivity(activity: Activity): boolean {
  return (
    activity.source === "history" ||
    provenanceOf(activity) === "demo" ||
    isSampleActivityId(activity.id)
  );
}

export function normalizeSampleActivity(activity: Activity): Activity {
  if (!isSampleActivity(activity)) return activity;
  if (
    activity.provenance === "demo" &&
    activity.disposition === "excluded" &&
    activity.verified === false
  ) {
    return activity;
  }
  return {
    ...activity,
    provenance: "demo",
    disposition: "excluded",
    verified: false,
    dispositionReason:
      activity.dispositionReason ?? "This session does not count toward competition.",
  };
}

export function dispositionOf(activity: Activity): ActivityDisposition {
  return activity.disposition ?? "counted";
}

/** Verified means a GPS session the tracker recorded, not a file or a sample. */
export function isVerifiedActivity(activity: Activity): boolean {
  if (provenanceOf(activity) !== "recorded") return false;
  if (isSampleActivity(activity)) return false;
  if (!sportById(activity.sport).gps) return false;
  return activity.verified;
}

export function sportCountsGps(sport: SportId): boolean {
  return sportById(sport).gps;
}

export { PRECEDENCE as activityProvenancePrecedence };