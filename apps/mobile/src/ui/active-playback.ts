import { AppState } from "react-native";

/** A presentation clock counts only active time and cancels immediately on inactivity. */
export function startActivePlayback(duration: number, publish: (progress: number) => void) {
  let elapsed = 0, started = 0, frame: number | null = null, disposed = false, completed = false;
  const pause = () => {
    if (frame === null) return;
    elapsed += Math.max(0, Date.now() - started);
    cancelAnimationFrame(frame);
    frame = null;
  };
  const resume = () => {
    if (disposed || completed || frame !== null || AppState.currentState !== "active") return;
    if (elapsed >= duration) { completed = true; publish(1); return; }
    started = Date.now();
    const tick = () => {
      if (disposed || AppState.currentState !== "active") { pause(); return; }
      const progress = Math.min(1, (elapsed + Math.max(0, Date.now() - started)) / duration);
      publish(progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else { completed = true; elapsed = duration; frame = null; }
    };
    frame = requestAnimationFrame(tick);
  };
  const subscription = AppState.addEventListener("change", status => status === "active" ? resume() : pause());
  resume();
  return () => { disposed = true; pause(); subscription.remove(); };
}
