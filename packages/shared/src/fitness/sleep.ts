import { scoreSleepNight, type SleepNight, type SleepSource } from "../compete/health";
import { dayKey } from "../period";

export interface RecordedSleepInput {
  id: string;
  end: string;
  durationSec: number;
  deepSec?: number;
  remSec?: number;
  lightSec?: number;
  awakeSec?: number;
  efficiency?: number;
  score?: number;
}

export function recordedSleep(
  provider: SleepSource,
  raw: RecordedSleepInput,
): SleepNight | null {
  const end = new Date(raw.end);
  if (!Number.isFinite(end.getTime()) || !Number.isFinite(raw.durationSec) || raw.durationSec <= 0) {
    return null;
  }
  const min = (n?: number) => (n != null && Number.isFinite(n) && n >= 0 ? n / 60 : null);
  const durationMin = raw.durationSec / 60;
  const deepMin = min(raw.deepSec);
  const remMin = min(raw.remSec);
  const efficiency = raw.efficiency ?? null;
  const id = raw.id.startsWith(`${provider}-sleep-`) ? raw.id : `${provider}-sleep-${raw.id}`;

  return {
    id,
    metric: "sleep",
    source: provider,
    verified: true,
    day: dayKey(end),
    durationMin,
    deepMin,
    remMin,
    lightMin: min(raw.lightSec),
    awakeMin: min(raw.awakeSec),
    efficiency,
    score: scoreSleepNight({
      durationMin,
      deepMin,
      remMin,
      efficiency,
      deviceScore: raw.score,
    }),
  };
}
