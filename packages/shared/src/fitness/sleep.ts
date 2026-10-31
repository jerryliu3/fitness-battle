import { scoreSleepNight, type SleepNight } from "../compete/health";
import { dayKey } from "../period";
export function recordedSleep(provider: "whoop" | "oura", raw: { id: string; end: string; durationSec: number; deepSec?: number; remSec?: number; lightSec?: number; awakeSec?: number; efficiency?: number; score?: number }): SleepNight | null {
 const end = new Date(raw.end);
 if (!Number.isFinite(end.getTime()) || !Number.isFinite(raw.durationSec) || raw.durationSec <= 0) return null;
 const min = (n?: number) => n != null && Number.isFinite(n) && n >= 0 ? n/60 : null;
 const durationMin=raw.durationSec/60,deepMin=min(raw.deepSec),remMin=min(raw.remSec),efficiency=raw.efficiency??null;
 return { id: `${provider}-sleep-${raw.id}`, metric:"sleep", source:provider, verified:true,day:dayKey(end),durationMin,deepMin,remMin,lightMin:min(raw.lightSec),awakeMin:min(raw.awakeSec),efficiency,score:scoreSleepNight({durationMin,deepMin,remMin,efficiency,deviceScore:raw.score}) };
}
