import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv, webEnv } from "@/lib/env";
import { getSupabaseConfig } from "@/lib/supabase/config";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const memory = new Map<string, string>();

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function serviceDb(): SupabaseClient | null {
  const { configured, supabaseUrl } = getSupabaseConfig();
  if (!configured || webEnv.useDemoData || !serverEnv.supabaseServiceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Maps Fitness Battle user id → Open Wearables user UUID. */
export async function getOwUserId(userId: string): Promise<string | null> {
  if (!isUuid(userId)) return memory.get(userId) ?? null;
  const db = serviceDb();
  if (!db) return memory.get(userId) ?? null;
  const { data, error } = await db
    .from("open_wearables_links")
    .select("ow_user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.ow_user_id ?? memory.get(userId) ?? null;
}

export async function setOwUserId(userId: string, owUserId: string): Promise<void> {
  memory.set(userId, owUserId);
  if (!isUuid(userId)) return;
  const db = serviceDb();
  if (!db) return;
  const { error } = await db.from("open_wearables_links").upsert(
    {
      user_id: userId,
      ow_user_id: owUserId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

export async function clearOwUserId(userId: string): Promise<void> {
  memory.delete(userId);
  if (!isUuid(userId)) return;
  const db = serviceDb();
  if (!db) return;
  const { error } = await db.from("open_wearables_links").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}
