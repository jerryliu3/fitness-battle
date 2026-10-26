import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { cancelAnimation, Easing, useSharedValue, withRepeat, withTiming, type SharedValue } from "react-native-reanimated";
import { polishedWakeDuration } from "@fitness-battle/shared";
import { useReducedMotion } from "./use-reduced-motion";

export type WakeAnimation = { gold: SharedValue<number>; platinum: SharedValue<number> };

/** Two UI-thread phases per field; lifecycle changes are the only React updates. */
export function useWakeAnimation(active: boolean): WakeAnimation | undefined {
  const gold = useSharedValue(0), platinum = useSharedValue(0);
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => setForeground(state === "active"));
    return () => subscription.remove();
  }, []);
  const running = active && focused && foreground && !reduced;
  useEffect(() => {
    if (running) for (const [phase, fast] of [[gold, true], [platinum, false]] as const) {
      phase.value = withRepeat(withTiming(1, { duration: polishedWakeDuration(fast) * 1000, easing: Easing.linear }), -1, false);
    }
    return () => { cancelAnimation(gold); cancelAnimation(platinum); gold.value = 0; platinum.value = 0; };
  }, [running, gold, platinum]);
  return useMemo(() => running ? { gold, platinum } : undefined, [running, gold, platinum]);
}
