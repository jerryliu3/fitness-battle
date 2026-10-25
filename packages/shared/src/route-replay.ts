/** Recorded route samples. Progress is distance along the retained GPS geometry. */
export interface RouteReplaySample {
  progress: number;
  elapsedSec: number;
  speedMps?: number;
  heartRate?: number;
  cadence?: number;
  cadenceUnit?: "spm" | "rpm";
}
export function normalizeRouteReplay(value: unknown): RouteReplaySample[] {
  if (!Array.isArray(value) || value.length > 20000) return [];
  const result: RouteReplaySample[] = [];
  for (const row of value) {
    if (!row || !Number.isFinite(row.progress) || row.progress < 0 || row.progress > 1 || !Number.isFinite(row.elapsedSec) || row.elapsedSec < 0) continue;
    const prior = result.at(-1);
    if (prior && (row.progress < prior.progress || row.elapsedSec < prior.elapsedSec)) continue;
    const sample: RouteReplaySample = { progress: row.progress, elapsedSec: row.elapsedSec };
    if (Number.isFinite(row.speedMps) && row.speedMps >= 0 && row.speedMps <= 100) sample.speedMps = row.speedMps;
    if (Number.isFinite(row.heartRate) && row.heartRate >= 20 && row.heartRate <= 260) sample.heartRate = row.heartRate;
    if (Number.isFinite(row.cadence) && row.cadence >= 0 && row.cadence <= 400 && (row.cadenceUnit === "spm" || row.cadenceUnit === "rpm")) {
      sample.cadence = row.cadence; sample.cadenceUnit = row.cadenceUnit;
    }
    result.push(sample);
  }
  return result;
}
/** Nearest recorded observation; do not carry readings across >30-second gaps. */
export function routeReplayAt(samples: readonly RouteReplaySample[], progress: number): RouteReplaySample | null {
  if (!samples.length || !Number.isFinite(progress)) return null;
  const p = Math.max(0, Math.min(1, progress));
  let low = 0, high = samples.length;
  while (low < high) { const mid = (low + high) >>> 1; if (samples[mid].progress < p) low = mid + 1; else high = mid; }
  const after = samples[low], before = samples[low - 1];
  if (!before) return after && Math.abs(after.progress - p) < .000001 ? after : null;
  if (!after) return Math.abs(before.progress - p) < .000001 ? before : null;
  if (after.elapsedSec - before.elapsedSec > 30 && Math.abs(after.progress-p) > .000001 && Math.abs(before.progress-p) > .000001) return null;
  return p - before.progress <= after.progress - p ? before : after;
}
