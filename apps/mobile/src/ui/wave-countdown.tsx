import { useEffect, useState } from "react";
import { AppText } from "./section";

export function waveCountdown(start: string, now: number) {
  const seconds = Math.max(0, Math.ceil((Date.parse(start) - now) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(value => String(value).padStart(2, "0")).join(":");
}

/** Keep the parent's competition clock intact, including debug previews. */
export function WaveCountdown({ start, now }: { start: string; now: Date }) {
  const baseline = now.getTime();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const mounted = Date.now();
    setElapsed(0);
    const timer = setInterval(() => setElapsed(Date.now() - mounted), 1000);
    return () => clearInterval(timer);
  }, [baseline, start]);
  return <AppText role="body" accessibilityLabel="Time until competition starts">{waveCountdown(start, baseline + elapsed)} remaining</AppText>;
}
