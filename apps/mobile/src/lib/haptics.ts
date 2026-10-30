import { hapticsEnabled, subscribeHaptics } from "./haptic-preferences";
export { useHapticsEnabled, setHapticsEnabled } from "./haptic-preferences";
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
subscribeHaptics(() => { if (!hapticsEnabled()) cancelHaptics(); });
const patterns = {
  pass: [[0, "light"]],
  lead: [[0, "light"], [140, "medium"]],
  combo: [[0, "light"], [140, "medium"]],
  earned: [[0, "soft"], [140, "light"], [340, "medium"]],
  confirm: [[0, "soft"], [120, "light"]],
} as const satisfies Record<string, readonly (readonly [number, HapticCue])[]>;

/** Returns a handle that can cancel only this playback, never its successor. */
export function playPattern(kind: keyof typeof patterns): () => void {
  if (!hapticsEnabled() || AppState.currentState !== "active") return () => {};
  cancelHaptics();
  const owner = generation;
  const cancel = () => { if (owner === generation) cancelHaptics(); };
  for (const [delay, cue] of patterns[kind]) {
    if (!delay) { void dispatchCue(cue); continue; }
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (generation === owner) void dispatchCue(cue);
    }, delay);
    timers.add(timer);
  }
  return cancel;
}

export async function playCue(
  kind: HapticCue,
  options?: { controlAlreadyPlayed?: boolean },
): Promise<void> {
  if (!hapticsEnabled() || AppState.currentState !== "active") return;
  if (options?.controlAlreadyPlayed || kind === "none") return;
  cancelHaptics();
  return dispatchCue(kind);
}

async function dispatchCue(kind: HapticCue): Promise<void> {
  if (!hapticsEnabled() || AppState.currentState !== "active") return;
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
