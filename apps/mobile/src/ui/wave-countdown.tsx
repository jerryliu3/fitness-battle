import { useEffect, useState } from "react";
import { AppText } from "./section";
import { AppState } from "react-native";
import { waveCountdown } from "@fitness-battle/shared";
export { waveCountdown } from "@fitness-battle/shared";

/** Keep the parent's competition clock intact, including debug previews. */
export function WaveCountdown({ start, now, prominent = false }: { start: string; now: Date; prominent?: boolean }) {
  const baseline = now.getTime();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const mounted = Date.now();
    setElapsed(0);
    let timer: ReturnType<typeof setInterval> | undefined;
    const update = () => setElapsed(Date.now() - mounted);
    const resume = (active: boolean) => {
      clearInterval(timer);
      if (active) { update(); timer = setInterval(update, 1000); }
    };
    resume(AppState.currentState === "active");
    const subscription = AppState.addEventListener("change", value => resume(value === "active"));
    return () => { clearInterval(timer); subscription.remove(); };
  }, [baseline, start]);
  return <AppText role={prominent ? "display" : "body"} accessibilityLabel="Time until competition starts">{baseline + elapsed >= Date.parse(start) ? "Your wave has started" : `${waveCountdown(start, baseline + elapsed)}${prominent ? "" : " remaining"}`}</AppText>;
}
