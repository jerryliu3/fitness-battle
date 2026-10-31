import { serviceDb } from "./fitness-store";
import type { SyncResult } from "@fitness-battle/shared";
export async function persistDailyHealth(userId:string, readings:NonNullable<SyncResult["dailyHealth"]>) {
 const db=serviceDb(); if(!db) throw new Error("store_unavailable");
 for(const r of readings) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(r.day)||!Number.isFinite(Date.parse(r.day))) continue;
  const values=Object.fromEntries(Object.entries({steps:r.steps,resting_hr:r.restingHr,hrv:r.hrv}).filter(([key,v])=>typeof v==="number"&&Number.isFinite(v)&&(key==="resting_hr"?v>0:v>=0)));
  if(!Object.keys(values).length)continue;
  const {error}=await db.from("daily_health_readings").upsert({user_id:userId,provider:r.provider,day:r.day,...values,updated_at:new Date().toISOString()},{onConflict:"user_id,provider,day",defaultToNull:false});
  if(error)throw new Error("daily_health_store_failed");
 }
}
