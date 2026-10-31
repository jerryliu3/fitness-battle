import { createHash } from "node:crypto";
import { mapGarminActivity, parseActivityFile, scoreSleepNight, type ActivitySample, type SleepNight } from "@fitness-battle/shared";

export const GARMIN_FEEDS = [
  "activities", "activityDetails", "activityFiles", "manuallyUpdatedActivities", "moveIQActivities",
  "deregistrations", "userPermissionsChange", "bloodPressures", "bodyComps", "breathingVariations",
  "dailies", "epochs", "hrv", "healthSnapshot", "hydration", "nutrition", "pulseox",
  "allDayRespiration", "skinTemp", "sleeps", "stressDetails", "userMetrics",
] as const;
export type GarminFeed = typeof GARMIN_FEEDS[number];
export type GarminRecord = Record<string, unknown> & { userId: string };
export type GarminPayload = Partial<Record<GarminFeed, GarminRecord[]>>;

export function parseGarminPush(raw: string): GarminPayload {
  const body: unknown = JSON.parse(raw);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid_payload");
  const entries = Object.entries(body);
  let count = 0;
  if (!entries.length || entries.some(([feed, items]) => {
    if (!(GARMIN_FEEDS as readonly string[]).includes(feed) || !Array.isArray(items)) return true;
    count += items.length;
    return items.some(item => !item || typeof item !== "object" || Array.isArray(item) || typeof item.userId !== "string" || !item.userId);
  }) || count > 500) throw new Error("invalid_payload");
  return body as GarminPayload;
}

export function garminRecordId(item: GarminRecord): string {
  return String(item.summaryId ?? item.activityId ?? item.calendarDate ?? createHash("sha256").update(JSON.stringify(item)).digest("hex"));
}

/** Details wrap the summary and use a -detail ID; all deliveries update one activity. */
export function garminActivity(feed: GarminFeed, item: GarminRecord): ActivitySample | null {
  if (!["activities", "activityDetails", "manuallyUpdatedActivities"].includes(feed)) return null;
  const summary = feed === "activityDetails" ? item.summary : item;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) throw new Error("invalid_activity_summary");
  const raw = { ...summary, summaryId: item.summaryId, activityId: item.activityId ?? (summary as GarminRecord).activityId,
    ...(feed === "activityDetails" ? { samples: item.samples } : {}),
    ...(feed === "manuallyUpdatedActivities" ? { manual: true } : {}),
  };
  const start = (raw as Record<string, unknown>).startTimeInSeconds;
  if (typeof start !== "number" || !Number.isFinite(start) || Math.abs(start * 1000) > 8.64e15) throw new Error("invalid_activity_time");
  if ("samples" in raw && raw.samples != null && (!Array.isArray(raw.samples) || raw.samples.some(p => !p || typeof p !== "object"))) throw new Error("invalid_activity_samples");
  return mapGarminActivity(raw as Parameters<typeof mapGarminActivity>[0]);
}

export function garminSleep(item: GarminRecord): SleepNight | null {
  const day = item.calendarDate;
  const seconds = item.durationInSeconds;
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) || typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return null;
  const minutes = (key: string) => typeof item[key] === "number" && Number.isFinite(item[key]) ? Math.max(0, item[key] as number) / 60 : null;
  const durationMin = seconds / 60, awakeMin = minutes("awakeDurationInSeconds"), deepMin = minutes("deepSleepDurationInSeconds"), remMin = minutes("remSleepInSeconds");
  const efficiency = awakeMin == null ? null : 100 * durationMin / (durationMin + awakeMin);
  const deviceScore = (item.overallSleepScore as { value?: unknown } | undefined)?.value;
  return { id: `garmin-sleep-${day}`, metric: "sleep", day, durationMin, efficiency, deepMin, remMin,
    lightMin: minutes("lightSleepDurationInSeconds"), awakeMin, source: "garmin", verified: true,
    score: scoreSleepNight({ durationMin, efficiency, deepMin, remMin, deviceScore: typeof deviceScore === "number" ? deviceScore : null }),
  };
}

export function garminFileUrl(item: GarminRecord): string {
  const url = new URL(String(item.callbackURL));
  if (url.protocol !== "https:" || url.hostname !== "apis.garmin.com" || url.port || url.username || url.password || url.pathname !== "/wellness-api/rest/activityFile") throw new Error("invalid_activity_file_url");
  return url.toString();
}

export function garminFileActivity(item: GarminRecord, bytes: Uint8Array): ActivitySample[] {
  const extension = String(item.fileType).toLowerCase();
  if (!["fit", "tcx", "gpx"].includes(extension)) throw new Error("unsupported_activity_file");
  const activities = parseActivityFile(`activity.${extension}`, bytes, "garmin").activities;
  // A callback identifies one Garmin activity. Never duplicate a multi-session file under one ID.
  if (activities.length !== 1) throw new Error("invalid_activity_file_sessions");
  const externalId = String(item.activityId ?? String(item.summaryId).replace(/-file$/, ""));
  if (!externalId || externalId === "undefined") throw new Error("activity_file_id_missing");
  return activities.map(activity => ({ ...activity, id: `garmin-${externalId}`, externalId,
    rawName: typeof item.activityName === "string" ? item.activityName : activity.rawName,
    verified: item.manual !== true && activity.categorySlug !== "strength" && Boolean(activity.detailedPolyline),
  }));
}
