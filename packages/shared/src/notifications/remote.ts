import {
  defaultNotificationPreferences,
  normalizeNotificationPreferences,
} from "./prefs";
import type {
  NotificationCategoryId,
  NotificationPlatform,
  NotificationPreferences,
  PushPermissionStatus,
  PushRegistration,
} from "./types";

export interface NotificationPreferencesRow {
  user_id: string;
  enabled: boolean;
  week_summary: boolean;
  rival_moves: boolean;
  lesson_reminder: boolean;
  connection_alerts: boolean;
  updated_at: string;
}

export interface PushDeviceRow {
  id: string;
  user_id: string;
  platform: NotificationPlatform;
  token: string;
  stub: boolean;
  permission_status: PushPermissionStatus;
  created_at: string;
  updated_at: string;
  last_seen_at: string;
}

export function preferencesToRow(
  userId: string,
  prefs: NotificationPreferences,
): NotificationPreferencesRow {
  return {
    user_id: userId,
    enabled: prefs.enabled,
    week_summary: prefs.categories.week_summary,
    rival_moves: prefs.categories.rival_moves,
    lesson_reminder: prefs.categories.lesson_reminder,
    connection_alerts: prefs.categories.connection_alerts,
    updated_at: prefs.updatedAt,
  };
}

export function deviceToRegistration(
  device: PushDeviceRow | null | undefined,
): PushRegistration | null {
  if (!device) return null;
  return {
    platform: device.platform,
    token: device.token,
    registeredAt: device.created_at,
    stub: device.stub,
  };
}

/** Pick the newest device for a platform, else the newest overall. */
export function pickDevice(
  devices: PushDeviceRow[],
  platform?: NotificationPlatform,
): PushDeviceRow | null {
  if (devices.length === 0) return null;
  const scoped = platform
    ? devices.filter((item) => item.platform === platform)
    : devices;
  const list = scoped.length > 0 ? scoped : devices;
  return [...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null;
}

export function preferencesFromRemote(
  row: NotificationPreferencesRow | null | undefined,
  devices: PushDeviceRow[] = [],
  platform?: NotificationPlatform,
  now: Date = new Date(),
): NotificationPreferences {
  const device = pickDevice(devices, platform);
  const registration = deviceToRegistration(device);
  if (!row) {
    const fallback = defaultNotificationPreferences(now);
    if (!registration || !device) return fallback;
    return normalizeNotificationPreferences(
      {
        ...fallback,
        enabled: true,
        permissionStatus: device.permission_status,
        registration,
      },
      now,
    );
  }
  return normalizeNotificationPreferences(
    {
      version: 1,
      enabled: row.enabled,
      categories: {
        week_summary: row.week_summary,
        rival_moves: row.rival_moves,
        lesson_reminder: row.lesson_reminder,
        connection_alerts: row.connection_alerts,
      } satisfies Record<NotificationCategoryId, boolean>,
      permissionStatus: device?.permission_status ?? (row.enabled ? "prompt" : "unknown"),
      registration,
      updatedAt: row.updated_at,
    },
    now,
  );
}
