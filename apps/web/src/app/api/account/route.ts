import { resolveRequestUserId } from "@/lib/auth/request-user";
import { serverEnv } from "@/lib/env";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to delete your account." },
      { status: 401 },
    );
  }

  if (!getSupabaseConfig().configured) {
    return NextResponse.json({ ok: true, demo: true });
  }

  if (!serverEnv.supabaseServiceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Account deletion is temporarily unavailable. Please try again later.",
      },
      { status: 503 },
    );
  }

  const { supabaseUrl } = getSupabaseConfig();
  const admin = createAdminClient(
    supabaseUrl,
    serverEnv.supabaseServiceRoleKey,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  // Supabase refuses to delete an auth user who still owns Storage objects.
  // The app writes flat avatar files under the authenticated user's exact folder.
  const avatars = admin.storage.from("avatars");
  const { data: photos, error: listError } = await avatars.list(userId, {
    limit: 1000,
  });
  if (listError)
    return NextResponse.json(
      { error: "Could not remove profile photos. Please try again." },
      { status: 500 },
    );
  const paths = (photos ?? [])
    .filter((photo) => photo.id && !photo.name.includes("/"))
    .map((photo) => `${userId}/${photo.name}`);
  if (paths.length) {
    const { error: removeError } = await avatars.remove(paths);
    if (removeError)
      return NextResponse.json(
        { error: "Could not remove profile photos. Please try again." },
        { status: 500 },
      );
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
