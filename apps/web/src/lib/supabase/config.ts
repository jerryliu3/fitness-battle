import { isSupabaseConfigured } from "@fitness-battle/shared";
export { isSupabaseConfigured } from "@fitness-battle/shared";
import { webEnv } from "@/lib/env";

export function getSupabaseConfig() {
  return {
    supabaseUrl: webEnv.supabaseUrl,
    supabaseAnonKey: webEnv.supabaseAnonKey,
    /** True when URL/key look like a real project (not local placeholders). */
    configured: isSupabaseConfigured(
      webEnv.supabaseUrl,
      webEnv.supabaseAnonKey,
    ),
  };
}
