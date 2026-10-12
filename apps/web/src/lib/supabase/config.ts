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

export function isSupabaseConfigured(url: string, anonKey: string): boolean {
  if (!url || !anonKey) return false;
  if (anonKey === "public-anon-key" || anonKey === "your-anon-key") return false;
  if (url.includes("127.0.0.1") || url.includes("localhost")) {
    // Local Supabase is fine when the anon key is a real JWT-shaped secret.
    return anonKey.length > 40;
  }
  return url.startsWith("https://") && anonKey.length > 20;
}
