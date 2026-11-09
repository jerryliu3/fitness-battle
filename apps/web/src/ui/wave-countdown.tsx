"use client";
import { useEffect, useState } from "react";
import { waveCountdown } from "@fitness-battle/shared";
import { AppText } from "./section";

export function WaveCountdown({ start, now }: { start: string; now: Date }) {
  const baseline = now.getTime();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const mounted = Date.now();
    let timer: ReturnType<typeof setInterval> | undefined;
    const update = () => setElapsed(Date.now() - mounted);
    const resume = () => {
      clearInterval(timer);
      if (!document.hidden) { update(); timer = setInterval(update, 1000); }
    };
    setElapsed(0);
    resume();
    document.addEventListener("visibilitychange", resume);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", resume); };
  }, [baseline, start]);
  return <AppText role="display" aria-label="Time until competition starts">{baseline + elapsed >= Date.parse(start) ? "Your wave has started" : waveCountdown(start, baseline + elapsed)}</AppText>;
}
