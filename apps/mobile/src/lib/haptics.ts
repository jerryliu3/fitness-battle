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

export async function playCue(
  kind: HapticCue,
  options?: { controlAlreadyPlayed?: boolean },
): Promise<void> {
  if (options?.controlAlreadyPlayed || kind === "none") return;
  const now = Date.now();
  if (kind === "selection" && now - lastAt < HAPTIC_MIN_INTERVAL_MS) return;
  lastAt = now;
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
