import type { RouteReplaySample } from "@fitness-battle/shared";

function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds) % 60).padStart(2, "0")}`;
}

export function RouteReplayMetrics({ sample, channels, running, units }: {
  sample: RouteReplaySample | null;
  channels: { speed: boolean; heartRate: boolean; cadence: boolean };
  running: boolean;
  units: "us" | "metric";
}) {
  const speed = sample?.speedMps;
  const paceDistance = units === "us" ? 1609.344 : 1000;
  const pace = speed && speed > 0 ? `${formatClock(paceDistance / speed)} /${units === "us" ? "mi" : "km"}` : "—";
  const speedText = speed != null ? `${(speed * (units === "us" ? 2.236936 : 3.6)).toFixed(1)} ${units === "us" ? "mph" : "km/h"}` : "—";

  return (
    <div className="route-recorded-metrics" aria-label="Recorded measurements at the replay position">
      <span><small aria-label="Recorded time">Time</small><b>{sample ? formatClock(sample.elapsedSec) : "—"}</b></span>
      {channels.speed && <span><small>{running ? "Pace" : "Speed"}</small><b>{running ? pace : speedText}</b></span>}
      {channels.heartRate && <span><small aria-label="Heart rate">HR</small><b>{sample?.heartRate != null ? `${Math.round(sample.heartRate)} bpm` : "—"}</b></span>}
      {channels.cadence && <span><small>Cadence</small><b>{sample?.cadence != null ? `${Math.round(sample.cadence)} ${sample.cadenceUnit}` : "—"}</b></span>}
    </div>
  );
}
