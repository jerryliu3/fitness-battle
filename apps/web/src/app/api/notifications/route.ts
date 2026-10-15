import { NextResponse } from "next/server";
import {
  normalizeNotificationPreferences,
  type NotificationPlatform,
} from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import {
  clearRemoteDevices,
  loadRemoteNotificationState,
  saveRemotePreferences,
  upsertRemoteDevice,
} from "@/lib/notifications-store";
import { createRequestClient } from "@/lib/supabase/request";

function parsePlatform(value: unknown): NotificationPlatform | undefined {
  if (value === "web" || value === "ios" || value === "android") return value;
  return undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = await resolveRequestUserId(
    request,
    url.searchParams.get("userId"),
  );
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const platform = parsePlatform(url.searchParams.get("platform"));
  try {
    const supabase = await createRequestClient(request);
    const state = await loadRemoteNotificationState(supabase, userId, platform);
    return NextResponse.json({
      prefs: state.prefs,
      devices: state.devices,
      persisted: state.persisted,
    });
  } catch {
    return NextResponse.json({ error: "notifications_unavailable" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    userId?: unknown;
    prefs?: unknown;
    platform?: unknown;
    registerDevice?: boolean;
    clearDevices?: boolean;
  } | null;

  const userId = await resolveRequestUserId(
    request,
    typeof body?.userId === "string" ? body.userId : null,
  );
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const prefs = normalizeNotificationPreferences(body?.prefs);
  const platform = parsePlatform(body?.platform) ?? prefs.registration?.platform ?? "web";

  try {
    const supabase = await createRequestClient(request);
    const prefsPersisted = await saveRemotePreferences(supabase, userId, prefs);
    let devicePersisted = false;

    if (body?.clearDevices) {
      devicePersisted = await clearRemoteDevices(supabase, userId, platform);
    } else if (
      body?.registerDevice !== false &&
      prefs.enabled &&
      prefs.registration?.token
    ) {
      const device = await upsertRemoteDevice(supabase, userId, {
        platform,
        token: prefs.registration.token,
        stub: prefs.registration.stub !== false,
        permissionStatus: prefs.permissionStatus,
      });
      devicePersisted = device != null;
    }

    if (!prefsPersisted && !devicePersisted) {
      return NextResponse.json({
        ok: true,
        prefs,
        devices: [],
        persisted: false,
      });
    }

    const state = await loadRemoteNotificationState(supabase, userId, platform);
    return NextResponse.json({
      ok: true,
      prefs: state.prefs,
      devices: state.devices,
      persisted: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "notifications_not_saved";
    return NextResponse.json(
      { error: message, persisted: false },
      { status: 500 },
    );
  }
}
