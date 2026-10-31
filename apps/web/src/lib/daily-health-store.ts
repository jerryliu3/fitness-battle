import { serviceDb } from "./fitness-store";
import type { SyncResult } from "@fitness-battle/shared";

interface DailyHealthRow {
  user_id: string;
  provider: string;
  day: string;
  steps?: number;
  resting_hr?: number;
  hrv?: number;
  updated_at: string;
}

export async function persistDailyHealth(
  userId: string,
  readings: NonNullable<SyncResult["dailyHealth"]>,
): Promise<void> {
  const db = serviceDb();
  if (!db) throw new Error("store_unavailable");
  if (!readings.length) return;

  // Merge readings by (provider, day) so duplicate entries combine into single rows
  const merged = new Map<string, DailyHealthRow>();
  for (const r of readings) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.day) || !Number.isFinite(Date.parse(r.day))) continue;
    const values: Partial<DailyHealthRow> = {};
    if (typeof r.steps === "number" && Number.isFinite(r.steps) && r.steps >= 0) {
      values.steps = r.steps;
    }
    if (typeof r.restingHr === "number" && Number.isFinite(r.restingHr) && r.restingHr > 0) {
      values.resting_hr = r.restingHr;
    }
    if (typeof r.hrv === "number" && Number.isFinite(r.hrv) && r.hrv >= 0) {
      values.hrv = r.hrv;
    }
    if (!Object.keys(values).length) continue;

    const key = `${r.provider}:${r.day}`;
    const existing = merged.get(key) ?? {
      user_id: userId,
      provider: r.provider,
      day: r.day,
      updated_at: new Date().toISOString(),
    };
    Object.assign(existing, values);
    merged.set(key, existing);
  }

  const rows = [...merged.values()];
  if (!rows.length) return;

  // Batch upsert in chunks of 50 to avoid request payload limits
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const { error } = await db.from("daily_health_readings").upsert(chunk, {
      onConflict: "user_id,provider,day",
      defaultToNull: false,
    });
    if (error) throw new Error("daily_health_store_failed");
  }
}
