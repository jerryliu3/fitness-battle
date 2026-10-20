import { createClient } from "@supabase/supabase-js";
import { serverEnv, webEnv } from "./env";
import { isOwnerEmail } from "./auth/design-access";
import { createRequestClient } from "./supabase/request";
import { getSupabaseConfig } from "./supabase/config";

export async function authorizeAdmin(request: Request) {
  if (!getSupabaseConfig().configured || webEnv.useDemoData) return null;
  const client = await createRequestClient(request);
  const { data, error } = await client.auth.getUser();
  return !error && data.user?.email_confirmed_at && isOwnerEmail(data.user.email) ? data.user.id : null;
}
export function adminDatabase() {
  if (!serverEnv.supabaseServiceRoleKey) return null;
  return createClient(getSupabaseConfig().supabaseUrl, serverEnv.supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
