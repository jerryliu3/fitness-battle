import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivitySample,
  FitnessConnection,
  StravaStore,
  StravaTokenSet,
} from "@fitness-battle/shared";
import { serverEnv, webEnv } from "./env";
import { getSupabaseConfig } from "./supabase/config";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const demoConnections = new Map<string, FitnessConnection>();
const demoTokens = new Map<string, StravaTokenSet>();

function rowToConnection(
  userId: string,
  row: {
    status: FitnessConnection["status"];
    connected_at: string | null;
    last_sync_at: string | null;
    last_activity_at: string | null;
  },
): FitnessConnection {
  return {
    userId,
    provider: "strava",
    status: row.status,
    connectedAt: row.connected_at,
    lastSyncAt: row.last_sync_at,
    lastActivityAt: row.last_activity_at,
  };
}

/** Durable Strava tokens + connection rows. Demo ids stay in memory. */
export function createDurableStravaStore(): StravaStore | undefined {
  const db = serviceDb();
  if (!db) return undefined;

  return {
    async getConnection(userId) {
      if (!isUuid(userId)) return demoConnections.get(userId) ?? null;
      const { data, error } = await db
        .from("fitness_connections")
        .select("status, connected_at, last_sync_at, last_activity_at")
        .eq("user_id", userId)
        .eq("provider", "strava")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return rowToConnection(userId, data);
    },
    async setConnection(connection) {
      if (!isUuid(connection.userId)) {
        demoConnections.set(connection.userId, connection);
        return;
      }
      const { error } = await db.from("fitness_connections").upsert(
        {
          user_id: connection.userId,
          provider: "strava",
          status: connection.status,
          connected_at: connection.connectedAt,
          last_sync_at: connection.lastSyncAt ?? null,
          last_activity_at: connection.lastActivityAt ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" },
      );
      if (error) throw new Error(error.message);
    },
    async deleteConnection(userId) {
      if (!isUuid(userId)) {
        demoConnections.delete(userId);
        return;
      }
      const { error } = await db
        .from("fitness_connections")
        .delete()
        .eq("user_id", userId)
        .eq("provider", "strava");
      if (error) throw new Error(error.message);
    },
    async getTokens(userId) {
      if (!isUuid(userId)) return demoTokens.get(userId) ?? null;
      const { data, error } = await db.rpc("read_fitness_tokens", {
        p_user_id: userId,
        p_provider: "strava",
      });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.access_token || !row.refresh_token || !row.expires_at) return null;
      return {
        accessToken: row.access_token as string,
        refreshToken: row.refresh_token as string,
        expiresAt: Math.floor(new Date(row.expires_at as string).getTime() / 1000),
        athleteId: row.athlete_external_id
          ? Number(row.athlete_external_id)
          : undefined,
      };
    },
    async setTokens(userId, tokens) {
      if (!isUuid(userId)) {
        demoTokens.set(userId, tokens);
        return;
      }
      const { error } = await db.rpc("store_fitness_tokens", {
        p_user_id: userId,
        p_provider: "strava",
        p_access_token: tokens.accessToken,
        p_refresh_token: tokens.refreshToken,
        p_expires_at: new Date(tokens.expiresAt * 1000).toISOString(),
        p_athlete_external_id:
          tokens.athleteId != null ? String(tokens.athleteId) : null,
      });
      if (error) throw new Error(error.message);
    },
    async deleteTokens(userId) {
      if (!isUuid(userId)) {
        demoTokens.delete(userId);
        return;
      }
      const { error } = await db.rpc("delete_fitness_tokens", {
        p_user_id: userId,
        p_provider: "strava",
      });
      if (error) throw new Error(error.message);
    },
  };
}

/** Write synced samples and refresh battle scores. Returns false when skipped. */
export async function persistSyncedActivities(
  userId: string,
  activities: ActivitySample[],
): Promise<boolean> {
  const db = serviceDb();
  if (!db || !isUuid(userId) || activities.length === 0) return false;

  const { data: categories, error: categoryError } = await db
    .from("categories")
    .select("id, slug");
  if (categoryError) throw new Error(categoryError.message);
  const bySlug = new Map(
    (categories ?? []).map((row) => [row.slug as string, row.id as string]),
  );

  const rows = activities.flatMap((activity) => {
    const categoryId = bySlug.get(activity.categorySlug);
    if (!categoryId) return [];
    return [
      {
        user_id: userId,
        provider: activity.provider === "mock" ? "mock" : "strava",
        external_id: activity.externalId,
        category_id: categoryId,
        started_at: activity.startedAt,
        metric_value: activity.metricValue,
        raw_name: activity.rawName,
      },
    ];
  });
  if (rows.length === 0) return false;

  const { error } = await db.from("activities").upsert(rows, {
    onConflict: "provider,external_id",
  });
  if (error) throw new Error(error.message);

  const { data: memberships, error: memberError } = await db
    .from("battle_memberships")
    .select("battle_id")
    .eq("user_id", userId);
  if (memberError) throw new Error(memberError.message);

  for (const membership of memberships ?? []) {
    const { error: scoreError } = await db.rpc(
      "recompute_battle_standings_internal",
      { p_battle_id: membership.battle_id },
    );
    if (scoreError) throw new Error(scoreError.message);
  }
  return true;
}
