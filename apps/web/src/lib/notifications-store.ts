import {
  preferencesFromRemote,
  preferencesToRow,
  type NotificationPreferences,
  type NotificationPreferencesRow,
  type PushDeviceRow,
  type NotificationPlatform,
  type PushPermissionStatus,
} from "@fitness-battle/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { webEnv } from "@/lib/env";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function canPersistNotifications(userId: string): boolean {
  const { configured } = getSupabaseConfig();
  if (!configured || webEnv.useDemoData) return false;
  return UUID_RE.test(userId);
}

export async function loadRemoteNotificationState(
  supabase: SupabaseClient,
  userId: string,
  platform?: NotificationPlatform,
): Promise<{
  prefs: NotificationPreferences;
  devices: PushDeviceRow[];
  persisted: boolean;
}> {
  if (!canPersistNotifications(userId)) {
    return {
      prefs: preferencesFromRemote(null, [], platform),
      devices: [],
      persisted: false,
    };
  }
  const [{ data: row }, { data: devices, error: deviceError }] = await Promise.all([
    supabase
      .from("notification_preferences")
      .select(
        "user_id, enabled, week_summary, rival_moves, lesson_reminder, connection_alerts, updated_at",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("push_devices")
      .select(
        "id, user_id, platform, token, stub, permission_status, created_at, updated_at, last_seen_at",
      )
      .eq("user_id", userId),
  ]);
  if (deviceError) {
    throw new Error("devices_unavailable");
  }
  return {
    prefs: preferencesFromRemote(
      (row as NotificationPreferencesRow | null) ?? null,
      (devices as PushDeviceRow[] | null) ?? [],
      platform,
    ),
    devices: (devices as PushDeviceRow[] | null) ?? [],
    persisted: true,
  };
}

export async function saveRemotePreferences(
  supabase: SupabaseClient,
  userId: string,
  prefs: NotificationPreferences,
): Promise<boolean> {
  if (!canPersistNotifications(userId)) return false;
  const { error } = await supabase
    .from("notification_preferences")
    .upsert(preferencesToRow(userId, prefs));
  if (error) throw new Error("preferences_not_saved");
  return true;
}

export async function upsertRemoteDevice(
  supabase: SupabaseClient,
  userId: string,
  input: {
    platform: NotificationPlatform;
    token: string;
    stub: boolean;
    permissionStatus: PushPermissionStatus;
  },
): Promise<PushDeviceRow | null> {
  if (!canPersistNotifications(userId)) return null;
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("push_devices")
    .upsert(
      {
        user_id: userId,
        platform: input.platform,
        token: input.token,
        stub: input.stub,
        permission_status: input.permissionStatus,
        updated_at: now,
        last_seen_at: now,
      },
      { onConflict: "user_id,platform,token" },
    )
    .select(
      "id, user_id, platform, token, stub, permission_status, created_at, updated_at, last_seen_at",
    )
    .single();
  if (error) throw new Error("device_not_saved");
  return data as PushDeviceRow;
}

export async function clearRemoteDevices(
  supabase: SupabaseClient,
  userId: string,
  platform?: NotificationPlatform,
): Promise<boolean> {
  if (!canPersistNotifications(userId)) return false;
  let query = supabase.from("push_devices").delete().eq("user_id", userId);
  if (platform) query = query.eq("platform", platform);
  const { error } = await query;
  if (error) throw new Error("device_not_cleared");
  return true;
}

export type OutboxStatus = "stubbed" | "queued" | "sent" | "failed";

export async function recordDelivery(
  supabase: SupabaseClient,
  input: {
    userId: string;
    category: string;
    title: string;
    body: string;
    path?: string;
    deviceCount: number;
    status: OutboxStatus;
  },
): Promise<{ id: string; persisted: boolean }> {
  if (!canPersistNotifications(input.userId)) {
    return { id: `local-${Date.now()}`, persisted: false };
  }
  const { data, error } = await supabase
    .from("notification_outbox")
    .insert({
      user_id: input.userId,
      category: input.category,
      title: input.title,
      body: input.body,
      path: input.path ?? null,
      status: input.status,
      device_count: input.deviceCount,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("outbox_not_saved");
  return { id: data.id as string, persisted: true };
}
