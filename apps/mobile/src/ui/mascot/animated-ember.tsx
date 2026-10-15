import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { EMBER_CLIPS, sampleEmber, type EmberAction, type EmberExpression } from "@fitness-battle/shared/mascot";
import { Ember } from "./ember";

/** One small JS-driven character at 30fps. Set active=false for an offscreen list item. */
export function AnimatedEmber({ action = "idle", expression, size = 160, active = true, playing = true, loop = true, restartKey = 0, label }: {
  action?: EmberAction; expression?: EmberExpression; size?: number; active?: boolean;
  playing?: boolean; loop?: boolean; restartKey?: number; label?: string;
}) {
  const [reduced, setReduced] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [focused, setFocused] = useState(false);
  const [time, setTime] = useState(0);
  const elapsed = useRef(0);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useEffect(() => {
    let alive = true;
    let changed = false;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive && !changed) setReduced(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", value => { changed = true; setReduced(value); });
    const app = AppState.addEventListener("change", state => setForeground(state === "active"));
    return () => { alive = false; motion.remove(); app.remove(); };
  }, []);
  useEffect(() => { elapsed.current = 0; setTime(0); }, [action, restartKey]);
  useEffect(() => {
    if (reduced || !foreground || !focused || !active || !playing) return;
    let raf = 0, previous = 0, published = 0;
    const duration = EMBER_CLIPS[action].duration;
    const tick = (now: number) => {
      if (previous) elapsed.current += Math.min(64, now - previous);
      previous = now;
      if (now - published >= 1000 / 30) {
        published = now; setTime(loop ? elapsed.current % duration : Math.min(duration, elapsed.current));
      }
      if (loop || elapsed.current < duration) raf = requestAnimationFrame(tick);
      else setTime(duration);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [action, active, foreground, focused, loop, playing, reduced, restartKey]);
  return <Ember size={size} pose={sampleEmber(action, time, { loop, reducedMotion: reduced })} expression={expression} label={label} />;
}
