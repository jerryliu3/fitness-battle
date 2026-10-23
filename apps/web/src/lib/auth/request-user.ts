
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

/** Database-backed synthetic and recorded-data accounts use the same authenticated session. */
export async function resolveSessionUserId(): Promise<string | null> {
  const { configured } = getSupabaseConfig();
  if (!configured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Configured apps use the session, or a Bearer access token from mobile.
 * Unconfigured offline previews accept only a local body id for stub routes.
 */
export async function resolveUserId(bodyUserId?: string | null): Promise<string | null> {
  const { configured } = getSupabaseConfig();
  if (configured) return resolveSessionUserId();
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
  if (match && configured) {
    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getUser(match[1]);
    if (error || !data.user) return null;
    return data.user.id;
  }
  return resolveUserId(bodyUserId);
}
