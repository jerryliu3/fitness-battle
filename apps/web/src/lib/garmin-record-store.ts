import type { SleepNight } from "@fitness-battle/shared";
import { getServerFitnessProvider } from "./fitness";
import { serviceDb } from "./fitness-store";
import { garminFileActivity, garminFileUrl, garminRecordId, type GarminRecord } from "./garmin-feeds";

export async function storeGarminRecord(userId: string, feed: string, item: GarminRecord) {
  const db = serviceDb();
  if (!db) throw new Error("store_unavailable");
  const { userAccessToken: _legacyToken, ...payload } = item;
  const { error } = await db.rpc("store_garmin_record", { p_user_id: userId, p_feed: feed, p_external_id: garminRecordId(item), p_payload: payload });
  if (error) throw new Error("garmin_record_store_failed");
  if ((feed === "dailies" || feed === "hrv") && typeof item.calendarDate === "string") {
    const metrics: { steps?: number; resting_hr?: number; hrv?: number } = {};
    if (feed === "dailies") {
      if (typeof item.steps === "number" && Number.isFinite(item.steps) && item.steps >= 0) {
        metrics.steps = item.steps;
      }
      if (
        typeof item.restingHeartRateInBeatsPerMinute === "number" &&
        Number.isFinite(item.restingHeartRateInBeatsPerMinute) &&
        item.restingHeartRateInBeatsPerMinute > 0
      ) {
        metrics.resting_hr = item.restingHeartRateInBeatsPerMinute;
      }
    } else {
      if (typeof item.lastNightAvg === "number" && Number.isFinite(item.lastNightAvg) && item.lastNightAvg >= 0) {
        metrics.hrv = item.lastNightAvg;
      }
    }
    if (Object.keys(metrics).length) {
      const { error } = await db.from("daily_health_readings").upsert(
        { user_id: userId, provider: "garmin", day: item.calendarDate, ...metrics, updated_at: new Date().toISOString() },
        { onConflict: "user_id,provider,day", defaultToNull: false },
      );
      if (error) throw new Error("daily_health_store_failed");
    }
  }
}

export const persistSleepNight = persistGarminSleep;

export async function persistGarminSleep(userId: string, night: SleepNight) {
  const db = serviceDb();
  if (!db) throw new Error("store_unavailable");
  const { error } = await db.from("sleep_nights").upsert({ user_id: userId, night_id: night.id, day: night.day,
    score: night.score, duration_min: night.durationMin, efficiency: night.efficiency, deep_min: night.deepMin,
    rem_min: night.remMin, light_min: night.lightMin, awake_min: night.awakeMin, source: night.source, verified: true,
  }, { onConflict: "user_id,night_id" });
  if (error) throw new Error("garmin_sleep_store_failed");
}

export async function fetchGarminFile(userId: string, item: GarminRecord) {
  const url = garminFileUrl(item), id = garminRecordId(item);
  const db = serviceDb();
  if (!db) throw new Error("store_unavailable");
  const { data, error } = await db.rpc("load_garmin_record", { p_user_id: userId, p_feed: "fileBytes", p_external_id: id });
  if (error) throw new Error("garmin_file_cache_failed");
  let base64 = data?.base64 as string | undefined;
  if (!base64) {
    // The callback's single-use token does not replace OAuth 2 bearer authentication.
    const response = await getServerFitnessProvider("garmin").downloadActivityFile(userId, url);
    if (!response.ok) throw new Error(`garmin_file_download_failed:${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("garmin_file_empty");
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 10_000_000) { await reader.cancel(); throw new Error("garmin_file_too_large"); }
      chunks.push(value);
    }
    base64 = Buffer.concat(chunks).toString("base64");
    // Cache before parsing/persistence: retries must not re-download the single-use URL.
    await storeGarminRecord(userId, "fileBytes", { userId: item.userId, summaryId: id, base64 });
  }
  return garminFileActivity(item, Buffer.from(base64, "base64"));
}
