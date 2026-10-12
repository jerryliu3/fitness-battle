import { webEnv } from "@/lib/env";
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
 * Live mode uses the session only (body user ids are ignored).
 * Demo mode accepts the device user id from the client.
 */
export async function resolveUserId(bodyUserId?: string | null): Promise<string | null> {
  const { configured } = getSupabaseConfig();
  if (configured && !webEnv.useDemoData) return resolveSessionUserId();
  const id = bodyUserId?.trim();
  return id ? id : null;
}
