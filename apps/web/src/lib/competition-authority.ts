import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "./env";
import { getSupabaseConfig } from "./supabase/config";

/** Only authorized server handlers use this client for competition data and derived scores. */
export function competitionAuthorityDatabase() {
  if (!serverEnv.supabaseServiceRoleKey) throw new Error("score_authority_not_configured");
  return createClient(getSupabaseConfig().supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
