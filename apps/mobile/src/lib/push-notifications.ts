import {
  NOTIFICATION_STORAGE_KEY,
  normalizeNotificationPreferences,
  parseNotificationPreferences,
  prepareNotificationDelivery,
  registerStubPush,
  serializeNotificationPreferences,
  setCategoryEnabled,
  unregisterPush,
  type NotificationCategoryId,
  type NotificationDeliveryPayload,
  type NotificationPlatform,
  type NotificationPreferences,
} from "@fitness-battle/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { mobileEnv } from "./env";
import { supabase } from "./supabase";

export type SyncIdentity = {
  userId: string;
  localOnly: boolean;
  accessToken?: string | null;
};

/** Serialize preference writes so rapid toggles cannot clobber each other. */
let writeChain: Promise<unknown> = Promise.resolve();

function enqueueWrite<T>(work: () => Promise<T>): Promise<T> {
  const run = writeChain.then(work, work);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

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

async function authHeaders(
  identity: SyncIdentity | null | undefined,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (identity?.accessToken) {
    headers.Authorization = `Bearer ${identity.accessToken}`;
  } else if (identity && !identity.localOnly) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function persistRemote(
  prefs: NotificationPreferences,
  identity: SyncIdentity | null | undefined,
  options: { registerDevice?: boolean; clearDevices?: boolean } = {},
): Promise<NotificationPreferences> {
  if (!identity || identity.localOnly) return prefs;
  try {
    const response = await fetch(`${mobileEnv.apiUrl}/api/notifications`, {
      method: "PUT",
      headers: await authHeaders(identity),
      body: JSON.stringify({
        userId: identity.userId,
        prefs,
        platform: detectionPlatform(),
        registerDevice: options.registerDevice ?? prefs.enabled,
        clearDevices: options.clearDevices ?? false,
      }),
    });
    const body = (await response.json()) as { prefs?: NotificationPreferences };
    if (!response.ok || !body.prefs) return prefs;
    return saveNotificationPreferences(
      normalizeNotificationPreferences(body.prefs),
    );
  } catch {
    return prefs;
  }
}

export async function hydrateNotificationPreferences(
  identity: SyncIdentity | null | undefined,
): Promise<NotificationPreferences> {
  const local = await loadNotificationPreferences();
  if (!identity || identity.localOnly) return local;
  try {
    const platform = detectionPlatform();
    const response = await fetch(
      `${mobileEnv.apiUrl}/api/notifications?userId=${encodeURIComponent(identity.userId)}&platform=${platform}`,
      { headers: await authHeaders(identity) },
    );
    if (!response.ok) return local;
    const body = (await response.json()) as {
      prefs?: NotificationPreferences;
      persisted?: boolean;
    };
    if (!body.prefs || body.persisted === false) return local;
    return saveNotificationPreferences(
      normalizeNotificationPreferences({
        ...body.prefs,
        registration: body.prefs.registration ?? local.registration,
      }),
    );
  } catch {
    return local;
  }
}

export async function enableNativePush(
  identity?: SyncIdentity | null,
): Promise<NotificationPreferences> {
  return enqueueWrite(async () => {
    const platform = detectionPlatform();
    const prefs = await loadNotificationPreferences();
    const saved = await saveNotificationPreferences(
      registerStubPush(prefs, platform),
    );
    return persistRemote(saved, identity, { registerDevice: true });
  });
}

export async function disableNativePush(
  identity?: SyncIdentity | null,
): Promise<NotificationPreferences> {
  return enqueueWrite(async () => {
    const prefs = await loadNotificationPreferences();
    const saved = await saveNotificationPreferences(unregisterPush(prefs));
    return persistRemote(saved, identity, { clearDevices: true });
  });
}

export async function updateNativeCategory(
  category: NotificationCategoryId,
  enabled: boolean,
  identity?: SyncIdentity | null,
): Promise<NotificationPreferences> {
  return enqueueWrite(async () => {
    const current = await loadNotificationPreferences();
    const saved = await saveNotificationPreferences(
      setCategoryEnabled(current, category, enabled),
    );
    return persistRemote(saved, identity, { registerDevice: saved.enabled });
  });
}

export type DeliverResult =
  | { ok: true; payload: NotificationDeliveryPayload; persisted?: boolean }
  | { ok: false; reason: "blocked" };

export async function deliverNativeNotification(
  payload: NotificationDeliveryPayload,
  identity?: SyncIdentity | null,
): Promise<DeliverResult> {
  const prefs = await loadNotificationPreferences();
  const prepared = prepareNotificationDelivery(prefs, payload);
  if (!prepared) return { ok: false, reason: "blocked" };

  if (identity && !identity.localOnly) {
    try {
      const response = await fetch(`${mobileEnv.apiUrl}/api/notifications/test`, {
        method: "POST",
        headers: await authHeaders(identity),
        body: JSON.stringify({
          userId: identity.userId,
          payload: prepared,
          prefs,
        }),
      });
      const body = (await response.json()) as { ok?: boolean; persisted?: boolean };
      if (response.ok && body.ok) {
        return { ok: true, payload: prepared, persisted: body.persisted === true };
      }
    } catch {
      // Fall through to local acknowledgement.
    }
  }

  return { ok: true, payload: prepared };
}
