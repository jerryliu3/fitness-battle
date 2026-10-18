import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { serverEnv, webEnv } from "@/lib/env";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

  if (webEnv.useDemoData || !serverEnv.supabaseServiceRoleKey) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const { supabaseUrl } = getSupabaseConfig();
  const admin = createAdminClient(
    supabaseUrl,
    serverEnv.supabaseServiceRoleKey,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
