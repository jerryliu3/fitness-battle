import type { ActivitySample, CategorySlug, FitnessConnection } from "../types";
import { mockFitnessProvider } from "./mock-provider";
import { syncWindow } from "./sync-window";
import type {
  FitnessAuthResult,
  FitnessProvider,
  SyncResult,
} from "./types";

export interface StravaEnv {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export interface StravaTokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  athleteId?: number;
}

export interface StravaActivityRaw {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date: string;
  distance: number;
  moving_time: number;
  average_heartrate?: number | null;
}

/** In-memory fallback when a durable store is not injected (dev / tests). */
const memoryConnections = new Map<string, FitnessConnection>();
const memoryTokens = new Map<string, StravaTokenSet>();

function hasCredentials(env: StravaEnv): boolean {
  return Boolean(env.clientId && env.clientSecret && env.redirectUri);
}

export function mapSportToCategory(sportType: string): CategorySlug {
  const normalized = sportType.toLowerCase();
  if (normalized.includes("ride") || normalized.includes("cycle")) {
    return "cycling";
  }
  if (normalized.includes("walk") || normalized.includes("hike")) {
    return "walking";
  }
  if (
    normalized.includes("weight") ||
    normalized.includes("strength") ||
    normalized.includes("workout")
  ) {
    return "strength";
  }
  return "running";
}

export function mapStravaActivity(
  raw: StravaActivityRaw,
  categorySlug?: CategorySlug,
): ActivitySample {
  const sport = raw.sport_type ?? raw.type ?? "Run";
  const mapped = mapSportToCategory(sport);
  const slug = categorySlug && categorySlug !== mapped ? mapped : mapped;
  const metricValue =
    slug === "strength" ? raw.moving_time : Math.max(0, raw.distance);
  return {
    id: `strava-${raw.id}`,
    provider: "strava",
    externalId: String(raw.id),
    categorySlug: slug,
    startedAt: raw.start_date,
    metricValue,
    rawName: raw.name || `${sport} activity`,
  };
}

export interface StravaStore {
  getConnection(userId: string): Promise<FitnessConnection | null>;
  setConnection(connection: FitnessConnection): Promise<void>;
  deleteConnection(userId: string): Promise<void>;
  getTokens(userId: string): Promise<StravaTokenSet | null>;
  setTokens(userId: string, tokens: StravaTokenSet): Promise<void>;
  deleteTokens(userId: string): Promise<void>;
}

function memoryStore(): StravaStore {
  return {
    async getConnection(userId) {
      return memoryConnections.get(userId) ?? null;
    },
    async setConnection(connection) {
      memoryConnections.set(connection.userId, connection);
    },
    async deleteConnection(userId) {
      memoryConnections.delete(userId);
    },
    async getTokens(userId) {
      return memoryTokens.get(userId) ?? null;
    },
    async setTokens(userId, tokens) {
      memoryTokens.set(userId, tokens);
    },
    async deleteTokens(userId) {
      memoryTokens.delete(userId);
    },
  };
}

export interface StravaHttp {
  fetch: (
    input: string | URL,
    init?: RequestInit,
  ) => Promise<Response>;
}

async function exchangeToken(
  env: StravaEnv,
  code: string,
  http: StravaHttp,
): Promise<StravaTokenSet> {
  const response = await http.fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    throw new Error(`strava_token_exchange_failed:${response.status}`);
  }
  const body = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete?: { id?: number };
  };
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: body.expires_at,
    athleteId: body.athlete?.id,
  };
}

async function refreshAccessToken(
  env: StravaEnv,
  refreshToken: string,
  http: StravaHttp,
): Promise<StravaTokenSet> {
  const response = await http.fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    throw new Error(`strava_token_refresh_failed:${response.status}`);
  }
  const body = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete?: { id?: number };
  };
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: body.expires_at,
    athleteId: body.athlete?.id,
  };
}

async function ensureAccessToken(
  env: StravaEnv,
  userId: string,
  store: StravaStore,
  http: StravaHttp,
): Promise<StravaTokenSet> {
  const existing = await store.getTokens(userId);
  if (!existing) throw new Error("strava_not_connected");
  const nowSec = Math.floor(Date.now() / 1000);
  if (existing.expiresAt > nowSec + 60) return existing;
  const refreshed = await refreshAccessToken(env, existing.refreshToken, http);
  await store.setTokens(userId, refreshed);
  return refreshed;
}

async function fetchAthleteActivities(
  accessToken: string,
  sinceIso: string,
  http: StravaHttp,
): Promise<StravaActivityRaw[]> {
  const after = Math.floor(new Date(sinceIso).getTime() / 1000);
  const collected: StravaActivityRaw[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const url = new URL("https://www.strava.com/api/v3/athlete/activities");
    url.searchParams.set("after", String(after));
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "100");
    const response = await http.fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`strava_activities_failed:${response.status}`);
    }
    const batch = (await response.json()) as StravaActivityRaw[];
    collected.push(...batch);
    if (batch.length < 100) break;
  }
  return collected;
}

/**
 * Strava OAuth + activity sync surface.
 * When client credentials are missing, connect/sync fall back to the mock provider
 * while keeping status=stub so the UI never claims a live connection.
 * Token exchange, refresh, and activity pull are implemented and used when keys exist.
 */
export function createStravaProvider(
  env: StravaEnv = {},
  options: { store?: StravaStore; http?: StravaHttp } = {},
): FitnessProvider & {
  completeOAuth(userId: string, code: string): Promise<FitnessAuthResult>;
} {
  const store = options.store ?? memoryStore();
  const http = options.http ?? { fetch };

  return {
    id: "strava",
    displayName: "Strava",
    async connect(userId) {
      if (!hasCredentials(env)) {
        await mockFitnessProvider.connect(userId);
        const connection: FitnessConnection = {
          userId,
          provider: "strava",
          connectedAt: new Date().toISOString(),
          status: "stub",
        };
        await store.setConnection(connection);
        return {
          provider: "strava",
          status: "stub",
          message:
            "Strava credentials missing — using stub/mock tracker. Set STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, and STRAVA_REDIRECT_URI to enable real OAuth.",
          authorizeUrl: undefined,
        };
      }

      const url = new URL("https://www.strava.com/oauth/authorize");
      url.searchParams.set("client_id", env.clientId!);
      url.searchParams.set("redirect_uri", env.redirectUri!);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("approval_prompt", "auto");
      url.searchParams.set("scope", "read,activity:read_all");
      url.searchParams.set("state", userId);

      await store.setConnection({
        userId,
        provider: "strava",
        connectedAt: null,
        status: "disconnected",
      });

      const result: FitnessAuthResult = {
        provider: "strava",
        status: "disconnected",
        authorizeUrl: url.toString(),
        message: "Open authorizeUrl to complete Strava OAuth.",
      };
      return result;
    },
    async completeOAuth(userId, code) {
      if (!hasCredentials(env)) {
        return this.connect(userId);
      }
      const tokens = await exchangeToken(env, code, http);
      await store.setTokens(userId, tokens);
      const connection: FitnessConnection = {
        userId,
        provider: "strava",
        connectedAt: new Date().toISOString(),
        status: "connected",
      };
      await store.setConnection(connection);
      return {
        provider: "strava",
        status: "connected",
        message: "Strava connected.",
      };
    },
    async disconnect(userId) {
      await store.deleteTokens(userId);
      await store.deleteConnection(userId);
    },
    async getConnection(userId) {
      return (
        (await store.getConnection(userId)) ?? {
          userId,
          provider: "strava",
          connectedAt: null,
          status: "disconnected",
        }
      );
    },
    async syncActivities(userId, options) {
      if (!hasCredentials(env)) {
        const mockSync = await mockFitnessProvider.syncActivities(
          userId,
          options,
        );
        const activities: ActivitySample[] = mockSync.activities.map((a) => ({
          ...a,
          provider: "strava",
          id: a.id.replace(/^mock-/, "strava-stub-"),
        }));
        const result: SyncResult = {
          provider: "strava",
          activities,
          syncedAt: new Date().toISOString(),
          usedMock: true,
        };
        return result;
      }

      const connection = await store.getConnection(userId);
      if (!connection || connection.status !== "connected") {
        return {
          provider: "strava",
          activities: [],
          syncedAt: new Date().toISOString(),
          usedMock: false,
        };
      }

      const window = syncWindow({
        lastSyncAt: options?.since ?? null,
        forceBackfill: !options?.since,
      });
      const tokens = await ensureAccessToken(env, userId, store, http);
      const raw = await fetchAthleteActivities(
        tokens.accessToken,
        options?.since ?? window.since,
        http,
      );
      let activities = raw.map((item) => mapStravaActivity(item));
      if (options?.categorySlug) {
        activities = activities.filter(
          (item) => item.categorySlug === options.categorySlug,
        );
      }
      return {
        provider: "strava",
        activities,
        syncedAt: new Date().toISOString(),
        usedMock: false,
      };
    },
  };
}
