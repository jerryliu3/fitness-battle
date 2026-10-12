import { createClient } from "@supabase/supabase-js";
import { webEnv } from "../env";

export function createSupabaseAnonClient() {
  return createClient(webEnv.supabaseUrl, webEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
