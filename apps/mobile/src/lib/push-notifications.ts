import {
  NOTIFICATION_STORAGE_KEY,
  normalizeNotificationPreferences,
  parseNotificationPreferences,
  prepareNotificationDelivery,
  registerStubPush,
  serializeNotificationPreferences,
  unregisterPush,
  type NotificationDeliveryPayload,
  type NotificationPlatform,
  type NotificationPreferences,
} from "@fitness-battle/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export function detectionPlatform(): NotificationPlatform {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  const raw = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
  return parseNotificationPreferences(raw);
}

export async function saveNotificationPreferences(
  prefs: NotificationPreferences,
): Promise<NotificationPreferences> {
  const next = normalizeNotificationPreferences(prefs);
  await AsyncStorage.setItem(
    NOTIFICATION_STORAGE_KEY,
    serializeNotificationPreferences(next),
  );
  return next;
}

/**
 * Enable push on native / Expo web. Uses a stub token until Expo Notifications
 * + a push service are wired. Permission is recorded as `stub` so UI can show
 * that delivery is not live yet.
 */
export async function enableNativePush(): Promise<NotificationPreferences> {
  const platform = detectionPlatform();
  const prefs = await loadNotificationPreferences();
  return saveNotificationPreferences(registerStubPush(prefs, platform));
}

export async function disableNativePush(): Promise<NotificationPreferences> {
  const prefs = await loadNotificationPreferences();
  return saveNotificationPreferences(unregisterPush(prefs));
}

export type DeliverResult =
  | { ok: true; payload: NotificationDeliveryPayload }
  | { ok: false; reason: "blocked" };

export async function deliverNativeNotification(
  payload: NotificationDeliveryPayload,
): Promise<DeliverResult> {
  const prefs = await loadNotificationPreferences();
  const prepared = prepareNotificationDelivery(prefs, payload);
  if (!prepared) return { ok: false, reason: "blocked" };
  return { ok: true, payload: prepared };
}
