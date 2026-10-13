import { webEnv } from "@/lib/env";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

/** Real Supabase session. Demo mode does not have one. */
export async function resolveSessionUserId(): Promise<string | null> {
  const { configured } = getSupabaseConfig();
  if (!configured || webEnv.useDemoData) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Live mode uses the session, or a Bearer access token from the mobile app.
 * Demo mode accepts the device user id from the client.
 */
export async function resolveUserId(bodyUserId?: string | null): Promise<string | null> {
  const { configured } = getSupabaseConfig();
  if (configured && !webEnv.useDemoData) return resolveSessionUserId();
  const id = bodyUserId?.trim();
  return id ? id : null;
}

/** Session cookie, Bearer token, or demo body id. */
export async function resolveRequestUserId(
  request: Request,
  bodyUserId?: string | null,
): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)/i.exec(header);
  const { configured, supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  if (match && configured && !webEnv.useDemoData) {
    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getUser(match[1]);
    if (error || !data.user) return null;
    return data.user.id;
  }
  return resolveUserId(bodyUserId);
}
