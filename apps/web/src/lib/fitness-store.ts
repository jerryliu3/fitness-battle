import { normalizeRouteReplay } from "@fitness-battle/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivitySample,
  FitnessConnection,
  FitnessProviderId,
  ReadinessSample,
  StravaStore,
  StravaTokenSet,
} from "@fitness-battle/shared";
import { serverEnv } from "./env";
import { getSupabaseConfig } from "./supabase/config";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CLOUD_PROVIDERS = new Set<FitnessProviderId>([
  "strava",
  "garmin",
  "apple_health",
  "google_health",
  "whoop",
  "oura",
  "mock",
]);

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function serviceDb(): SupabaseClient | null {
  const { configured, supabaseUrl } = getSupabaseConfig();
  if (!configured || !serverEnv.supabaseServiceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const demoConnections = new Map<string, FitnessConnection>();
const demoTokens = new Map<string, StravaTokenSet>();

function demoKey(provider: FitnessProviderId, userId: string): string {
  return `${provider}:${userId}`;
}

function rowToConnection(
  userId: string,
  provider: FitnessProviderId,
  row: {
    status: FitnessConnection["status"];
    connected_at: string | null;
    last_sync_at: string | null;
    last_activity_at: string | null;
  },
): FitnessConnection {
  return {
    userId,
    provider,
    status: row.status,
    connectedAt: row.connected_at,
    lastSyncAt: row.last_sync_at,
    lastActivityAt: row.last_activity_at,
  };
}

/** Durable tokens + connection rows for one provider. Demo ids stay in memory. */
export function createProviderStore(provider: FitnessProviderId): StravaStore | undefined {
  const db = serviceDb();
  if (!db) return undefined;

  return {
    async getConnection(userId) {
      if (!isUuid(userId)) return demoConnections.get(demoKey(provider, userId)) ?? null;
      const { data, error } = await db
        .from("fitness_connections")
        .select("status, connected_at, last_sync_at, last_activity_at")
        .eq("user_id", userId)
        .eq("provider", provider)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return rowToConnection(userId, provider, data);
    },
    async setConnection(connection) {
      if (!isUuid(connection.userId)) {
        demoConnections.set(demoKey(provider, connection.userId), connection);
        return;
      }
      const { error } = await db.from("fitness_connections").upsert(
        {
          user_id: connection.userId,
          provider,
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
        demoConnections.delete(demoKey(provider, userId));
        return;
      }
      const { error } = await db
        .from("fitness_connections")
        .delete()
        .eq("user_id", userId)
        .eq("provider", provider);
      if (error) throw new Error(error.message);
    },
    async getTokens(userId) {
      if (!isUuid(userId)) return demoTokens.get(demoKey(provider, userId)) ?? null;
      const { data, error } = await db.rpc("read_fitness_tokens", {
        p_user_id: userId,
        p_provider: provider,
      });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.access_token || !row.refresh_token || !row.expires_at) return null;
      return {
        accessToken: row.access_token as string,
        refreshToken: row.refresh_token as string,
        expiresAt: Math.floor(new Date(row.expires_at as string).getTime() / 1000),
        athleteId: (row.athlete_external_id as string | null) ?? undefined,
      };
    },
    async setTokens(userId, tokens) {
      if (!isUuid(userId)) {
        demoTokens.set(demoKey(provider, userId), tokens);
        return;
      }
      const { error } = await db.rpc("store_fitness_tokens", {
        p_user_id: userId,
        p_provider: provider,
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
        demoTokens.delete(demoKey(provider, userId));
        return;
      }
      const { error } = await db.rpc("delete_fitness_tokens", {
        p_user_id: userId,
        p_provider: provider,
      });
      if (error) throw new Error(error.message);
    },
  };
}

export function createDurableStravaStore(): StravaStore | undefined {
  return createProviderStore("strava");
}

export async function userIdForAthlete(
  provider: FitnessProviderId,
  athleteExternalId: string,
): Promise<string | null> {
  const db = serviceDb();
  if (!db) return null;
  const { data, error } = await db.rpc("user_id_for_fitness_athlete", {
    p_provider: provider,
    p_athlete_external_id: athleteExternalId,
  });
  if (error) throw new Error(error.message);
  return typeof data === "string" ? data : null;
}

export async function userIdForAccessToken(
  provider: FitnessProviderId,
  accessToken: string,
): Promise<string | null> {
  const db = serviceDb();
  if (!db) {
    for (const [key, tokens] of demoTokens) {
      if (key.startsWith(`${provider}:`) && tokens.accessToken === accessToken) {
        return key.slice(provider.length + 1);
      }
    }
    return null;
  }
  const { data, error } = await db.rpc("user_id_for_fitness_access_token", {
    p_provider: provider,
    p_access_token: accessToken,
  });
  if (error) throw new Error(error.message);
  return typeof data === "string" ? data : null;
}

async function recomputeMemberships(
  db: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data: memberships, error: memberError } = await db
    .from("battle_memberships")
    .select("battle_id")
    .eq("user_id", userId);
  if (memberError) throw new Error(memberError.message);
  for (const membership of memberships ?? []) {
    const { error: scoreError } = await db.rpc("recompute_battle_standings_internal", {
      p_battle_id: membership.battle_id,
    });
    if (scoreError) throw new Error(scoreError.message);
  }
}

/** Write synced samples and refresh battle scores. Returns false when skipped. */
export async function persistSyncedActivities(
  userId: string,
  activities: ActivitySample[],
  provenance: "recorded" | "imported" = "recorded",
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
    if (!CLOUD_PROVIDERS.has(activity.provider) || activity.provider === "mock") return [];
    const categoryId = bySlug.get(activity.categorySlug);
    if (!categoryId) return [];
    const sport = activity.categorySlug;
    return [
      {
        user_id: userId,
        provider: activity.provider,
        external_id: activity.externalId,
        category_id: categoryId,
        started_at: activity.startedAt,
        metric_value: activity.metricValue,
        moving_sec: activity.movingSec ?? null,
        avg_hr: activity.avgHr ?? null,
        raw_name: activity.rawName,
        summary_polyline: activity.summaryPolyline ?? null,
        detailed_polyline: activity.detailedPolyline ?? null,
        route_replay: activity.routeReplay == null ? null : normalizeRouteReplay(activity.routeReplay),
        route_bounds: activity.routeBounds ?? null,
        elevation_gain_m: activity.elevationGainM ?? null,
        sport,
        distance_m: sport === "strength" ? 0 : Number(activity.metricValue ?? 0),
        verified: provenance === "recorded" && sport !== "strength" && (activity.verified ?? activity.provider !== "garmin"),
        provenance,
        disposition: provenance === "imported" ? "pending" : "counted",
        compete_key: activity.id,
        source_label: activity.provider,
      },
    ];
  });
  if (rows.length === 0) return false;

  const { error } = await db.from("activities").upsert(rows, {
    onConflict: "user_id,provider,external_id",
  });
  if (error) throw new Error(error.message);
  await recomputeMemberships(db, userId);
  return true;
}

export async function persistReadiness(
  userId: string,
  marks: ReadinessSample[],
): Promise<boolean> {
  const db = serviceDb();
  if (!db || !isUuid(userId) || marks.length === 0) return false;
  const rows = marks
    .filter((mark) => CLOUD_PROVIDERS.has(mark.provider) && mark.provider !== "mock")
    .map((mark) => ({
      user_id: userId,
      provider: mark.provider,
      external_id: mark.externalId,
      day: mark.day,
      score: mark.score,
    }));
  if (rows.length === 0) return false;
  const { error } = await db.from("readiness_marks").upsert(rows, {
    onConflict: "user_id,provider,external_id",
  });
  if (error) throw new Error(error.message);
  return true;
}
