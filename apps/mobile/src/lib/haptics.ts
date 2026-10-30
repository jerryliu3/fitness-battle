import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { AppState } from "react-native";
import * as Haptics from "expo-haptics";
import {
  HAPTIC_MIN_INTERVAL_MS,
  type HapticCue,
} from "@fitness-battle/shared";

const impacts: Record<string, Haptics.ImpactFeedbackStyle> = {
  soft: Haptics.ImpactFeedbackStyle.Soft,
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
};

const notifications: Record<string, Haptics.NotificationFeedbackType> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

let enabled = false;
let preferenceLoaded = false;
const listeners = new Set<() => void>();
const preferenceKey = "overtaek:haptics:v1";
void AsyncStorage.getItem(preferenceKey).then(value => {
  if (preferenceLoaded) return;
  enabled = value !== "off"; preferenceLoaded = true;
  listeners.forEach(listener => listener());
}).catch(() => { preferenceLoaded = true; });
export function useHapticsEnabled() {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => enabled, () => false);
}
export function setHapticsEnabled(value: boolean) {
  preferenceLoaded = true; enabled = value;
  cancelHaptics(); listeners.forEach(listener => listener());
  void AsyncStorage.setItem(preferenceKey, value ? "on" : "off").catch(() => {});
}
let lastAt = 0;
let lastKind: HapticCue = "none";
let generation = 0;
const timers = new Set<ReturnType<typeof setTimeout>>();
export function cancelHaptics() {
  generation++;
  timers.forEach(clearTimeout);
  timers.clear();
}
AppState.addEventListener("change", state => { if (state !== "active") cancelHaptics(); });
export function playPattern(kind: "pass" | "lead" | "earned" | "confirm") {
  cancelHaptics();
  const owner = generation;
  const beats: [number, HapticCue][] = kind === "pass" ? [[0,"soft"],[90,"light"]]
    : kind === "confirm" ? [[0,"soft"],[120,"light"]]
    : kind === "lead" ? [[0,"soft"],[90,"light"],[230,"medium"]]
    : [[0,"soft"],[140,"light"],[340,"medium"]];
  for (const [delay, cue] of beats) {
    const timer = setTimeout(() => { timers.delete(timer); if (generation === owner) void playCue(cue); }, delay);
    timers.add(timer);
  }
}

export async function playCue(
  kind: HapticCue,
  options?: { controlAlreadyPlayed?: boolean },
): Promise<void> {
  if (!enabled || AppState.currentState !== "active") return;
  if (options?.controlAlreadyPlayed || kind === "none") return;
  const now = Date.now();
  if (now - lastAt < HAPTIC_MIN_INTERVAL_MS && (kind === "selection" || kind === lastKind)) return;
  lastAt = now;
  lastKind = kind;
  try {
    if (kind === "selection") await Haptics.selectionAsync();
    else if (kind in impacts)
      await Haptics.impactAsync(impacts[kind as keyof typeof impacts]);
    else if (kind in notifications)
      await Haptics.notificationAsync(
        notifications[kind as keyof typeof notifications],
      );
  } catch {
    /* unsupported hardware / settings */
  }
}
