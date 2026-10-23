import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase client scoped to the incoming request auth.
 * Prefer Bearer (mobile) so RLS sees auth.uid(); otherwise cookie session (web).
 */
export async function createRequestClient(
  request: Request,
): Promise<SupabaseClient> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)/i.exec(header);
  const { configured, supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  if (match?.[1] && configured) {
    return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${match[1]}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return createClient();
}
