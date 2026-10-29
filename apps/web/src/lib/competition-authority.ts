import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "./env";
import { getSupabaseConfig } from "./supabase/config";

/** Only authenticated route handlers use this client to commit derived scores. */
export function competitionAuthorityDatabase() {
  if (!serverEnv.supabaseServiceRoleKey) throw new Error("score_authority_not_configured");
  return createClient(getSupabaseConfig().supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
