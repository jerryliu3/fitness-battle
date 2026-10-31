import type { SleepNight } from "../compete/health";
import type {
  ActivitySample,
  FitnessConnection,
  FitnessProviderId,
  ReadinessSample,
} from "../types";
import { mockFitnessProvider } from "./mock-provider";
import { syncWindow } from "./sync-window";
import type { DailyHealthSample, FitnessAuthResult, FitnessProvider, SyncResult } from "./types";
import { encodeForm, readJson, type FitnessHttp } from "./http";
import type { StravaStore, StravaTokenSet } from "./strava-provider";

export interface OAuth2Env {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export interface OAuth2Pull {
  activities: ActivitySample[];
  readiness: ReadinessSample[];
  sleepNights?: SleepNight[];
  dailyHealth?: DailyHealthSample[];
}

export interface OAuth2Spec {
  id: Exclude<FitnessProviderId, "mock">;
  displayName: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string;
  missingCredentialsMessage: string;
  revoke?(accessToken: string, http: FitnessHttp): Promise<void>;
  pull(
    accessToken: string,
    since: string,
    until: string,
    http: FitnessHttp,
  ): Promise<OAuth2Pull>;
}

function memoryStoreFor(id: string): StravaStore {
  const bag = ((globalThis as { __fbOAuthMemory?: Map<string, StravaStore> }).__fbOAuthMemory ??=
    new Map());
  const existing = bag.get(id);
  if (existing) return existing;
  const connections = new Map<string, FitnessConnection>();
  const tokens = new Map<string, StravaTokenSet>();
  const store: StravaStore = {
    async getConnection(userId) {
      return connections.get(userId) ?? null;
    },
    async setConnection(connection) {
      connections.set(connection.userId, connection);
    },
    async deleteConnection(userId) {
      connections.delete(userId);
    },
    async getTokens(userId) {
      return tokens.get(userId) ?? null;
    },
    async setTokens(userId, next) {
      tokens.set(userId, next);
    },
    async deleteTokens(userId) {
      tokens.delete(userId);
    },
  };
  bag.set(id, store);
  return store;
}

function hasCredentials(env: OAuth2Env): boolean {
  return Boolean(env.clientId && env.clientSecret && env.redirectUri);
}

function tokenSet(body: {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}): StravaTokenSet {
  if (!body.access_token) throw new Error("oauth_token_missing_access");
  const expiresIn = body.expires_in ?? 3600;
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? "",
    expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
  };
}

async function postToken(
  spec: OAuth2Spec,
  env: OAuth2Env,
  fields: Record<string, string>,
  http: FitnessHttp,
): Promise<StravaTokenSet> {
  const response = await http.fetch(spec.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: encodeForm({
      client_id: env.clientId!,
      client_secret: env.clientSecret!,
      ...fields,
    }),
  });
  if (!response.ok) {
    throw new Error(`${spec.id}_token_failed:${response.status}`);
  }
  const json = (await readJson(response)) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  return tokenSet(json);
}

export function createOAuth2Provider(
  spec: OAuth2Spec,
  env: OAuth2Env = {},
  options: { store?: StravaStore; http?: FitnessHttp } = {},
): FitnessProvider & {
  completeOAuth(userId: string, code: string): Promise<FitnessAuthResult>;
} {
  const store = options.store ?? memoryStoreFor(spec.id);
  const http = options.http ?? { fetch };

  async function ensureAccess(userId: string): Promise<StravaTokenSet> {
    const existing = await store.getTokens(userId);
    if (!existing) throw new Error(`${spec.id}_not_connected`);
    if (existing.expiresAt * 1000 > Date.now() + 60_000) return existing;
    if (!existing.refreshToken) throw new Error(`${spec.id}_refresh_missing`);
    const next = await postToken(
      spec,
      env,
      {
        grant_type: "refresh_token",
        refresh_token: existing.refreshToken,
        ...(spec.id === "whoop" ? { scope: "offline" } : {}),
      },
      http,
    );
    const merged: StravaTokenSet = {
      ...next,
      refreshToken: next.refreshToken || existing.refreshToken,
      athleteId: existing.athleteId,
    };
    await store.setTokens(userId, merged);
    return merged;
  }

  return {
    id: spec.id,
    displayName: spec.displayName,
    async connect(userId) {
      if (!hasCredentials(env)) {
        await mockFitnessProvider.connect(userId);
        const connection: FitnessConnection = {
          userId,
          provider: spec.id,
          connectedAt: new Date().toISOString(),
          status: "stub",
        };
        await store.setConnection(connection);
        return {
          provider: spec.id,
          status: "stub",
          message: spec.missingCredentialsMessage,
        };
      }
      const url = new URL(spec.authorizeUrl);
      url.searchParams.set("client_id", env.clientId!);
      url.searchParams.set("redirect_uri", env.redirectUri!);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", spec.scopes);
      url.searchParams.set("state", userId);
      return {
        provider: spec.id,
        status: "disconnected",
        authorizeUrl: url.toString(),
        message: `Open authorizeUrl to complete ${spec.displayName} OAuth.`,
      };
    },
    async completeOAuth(userId, code) {
      if (!hasCredentials(env)) return this.connect(userId);
      const tokens = await postToken(
        spec,
        env,
        {
          grant_type: "authorization_code",
          code,
          redirect_uri: env.redirectUri!,
        },
        http,
      );
      await store.setTokens(userId, tokens);
      const connection: FitnessConnection = {
        userId,
        provider: spec.id,
        connectedAt: new Date().toISOString(),
        status: "connected",
      };
      await store.setConnection(connection);
      return {
        provider: spec.id,
        status: "connected",
        message: `${spec.displayName} connected.`,
      };
    },
    async disconnect(userId) {
      const existing = await store.getTokens(userId);
      if (existing && hasCredentials(env) && spec.revoke) {
        const tokens = await ensureAccess(userId);
        await spec.revoke(tokens.accessToken, http);
      }
      await store.deleteTokens(userId);
      await store.deleteConnection(userId);
    },
    async getConnection(userId) {
      return (
        (await store.getConnection(userId)) ?? {
          userId,
          provider: spec.id,
          connectedAt: null,
          status: "disconnected",
        }
      );
    },
    async syncActivities(userId, options) {
      if (!hasCredentials(env)) {
        const mockSync = await mockFitnessProvider.syncActivities(userId, options);
        const activities = mockSync.activities.map((activity) => ({
          ...activity,
          provider: spec.id,
          id: activity.id.replace(/^mock-/, `${spec.id}-stub-`),
        }));
        const syncedAt = new Date().toISOString();
        const existing = await store.getConnection(userId);
        if (existing) {
          await store.setConnection({ ...existing, lastSyncAt: syncedAt });
        }
        const result: SyncResult = {
          provider: spec.id,
          activities,
          readiness: [],
          syncedAt,
          usedMock: true,
        };
        return result;
      }
      const connection = await store.getConnection(userId);
      if (!connection || connection.status !== "connected") {
        return {
          provider: spec.id,
          activities: [],
          readiness: [],
          syncedAt: new Date().toISOString(),
          usedMock: false,
        };
      }
      const since = options?.since ?? syncWindow({ forceBackfill: true }).since;
      const until = new Date().toISOString();
      const tokens = await ensureAccess(userId);
      const pulled = await spec.pull(tokens.accessToken, since, until, http);
      let activities = pulled.activities;
      if (options?.categorySlug) {
        activities = activities.filter(
          (item) => item.categorySlug === options.categorySlug,
        );
      }
      const syncedAt = new Date().toISOString();
      await store.setConnection({
        ...connection,
        lastSyncAt: syncedAt,
        lastActivityAt:
          activities.map((item) => item.startedAt).sort().at(-1) ??
          connection.lastActivityAt ??
          null,
      });
      return {
        provider: spec.id,
        activities,
        readiness: pulled.readiness,
        sleepNights: pulled.sleepNights,
        dailyHealth: pulled.dailyHealth,
        syncedAt,
        usedMock: false,
        since,
      };
    },
  };
}
