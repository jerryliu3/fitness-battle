import { isExpoPushToken } from "./prefs";
import type { NotificationPreferences } from "./types";

function liveRank(prefs: NotificationPreferences): number {
  const reg = prefs.registration;
  if (!reg?.token) return 0;
  if (!reg.stub && isExpoPushToken(reg.token)) return 3;
  if (!reg.stub) return 2;
  return 1;
}

/**
 * Merge account (remote) prefs with on-device state.
 * Categories follow the newer updatedAt; registration prefers a live Expo
 * token and never drops a local token for an empty remote row.
 */
export function mergeNotificationPreferences(
  local: NotificationPreferences,
  remote: NotificationPreferences,
): NotificationPreferences {
  const remoteNewer =
    Date.parse(remote.updatedAt) >= Date.parse(local.updatedAt);
  const categories = remoteNewer ? remote.categories : local.categories;
  const enabled = remoteNewer ? remote.enabled : local.enabled;

  let registration = remote.registration ?? local.registration;
  if (liveRank(local) > liveRank(remote)) {
    registration = local.registration;
  } else if (liveRank(remote) > liveRank(local)) {
    registration = remote.registration;
  } else if (!remote.registration?.token && local.registration?.token) {
    registration = local.registration;
  }

  const permissionStatus =
    registration && liveRank({ ...local, registration }) >= 2
      ? registration.stub
        ? local.permissionStatus === "granted" ||
          remote.permissionStatus === "granted"
          ? "granted"
          : "stub"
        : "granted"
      : remoteNewer
        ? remote.permissionStatus
        : local.permissionStatus;

  return {
    version: 1,
    enabled: registration?.token ? enabled || local.enabled : enabled,
    categories,
    permissionStatus,
    registration,
    updatedAt: remoteNewer ? remote.updatedAt : local.updatedAt,
  };
}
