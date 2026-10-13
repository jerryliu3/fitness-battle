import type { ActivitySample, CategorySlug, FitnessConnection } from "../types";
import type { FitnessHttp } from "./http";
import { readJson } from "./http";
import { mockFitnessProvider } from "./mock-provider";
import {
  oauth1AuthorizationHeader,
  parseOAuth1Body,
  type OAuth1Credentials,
} from "./oauth1";
import { mapSportToCategory, type StravaStore, type StravaTokenSet } from "./strava-provider";
import { syncWindow } from "./sync-window";
import type { FitnessAuthResult, FitnessProvider } from "./types";

/**
 * Garmin Health API uses OAuth 1.0a. Consumer key and secret arrive only after
 * Garmin approves the app. URLs match the current Health API guide and can be
 * overridden when Garmin issues different hosts.
 *
 * https://developer.garmin.com/gc-developer-program/health-api/
 */
export interface GarminEnv {
  consumerKey?: string;
  consumerSecret?: string;
  redirectUri?: string;
  requestTokenUrl?: string;
  authorizeUrl?: string;
  accessTokenUrl?: string;
  userIdUrl?: string;
  activitiesUrl?: string;
}

export const GARMIN_DEFAULTS = {
  requestTokenUrl: "https://connectapi.garmin.com/oauth-service/oauth/request_token",
  authorizeUrl: "https://connect.garmin.com/oauthConfirm",
  accessTokenUrl: "https://connectapi.garmin.com/oauth-service/oauth/access_token",
  userIdUrl: "https://apis.garmin.com/wellness-api/rest/user/id",
  activitiesUrl: "https://apis.garmin.com/wellness-api/rest/activities",
};

interface GarminSummary {
  summaryId?: string;
  activityId?: string | number;
  activityName?: string;
  activityType?: string;
  startTimeInSeconds?: number;
  durationInSeconds?: number;
  distanceInMeters?: number;
  averageHeartRateInBeatsPerMinute?: number;
}

function configured(env: GarminEnv): boolean {
  return Boolean(env.consumerKey && env.consumerSecret && env.redirectUri);
}

function endpoints(env: GarminEnv) {
  return {
    requestTokenUrl: env.requestTokenUrl || GARMIN_DEFAULTS.requestTokenUrl,
    authorizeUrl: env.authorizeUrl || GARMIN_DEFAULTS.authorizeUrl,
    accessTokenUrl: env.accessTokenUrl || GARMIN_DEFAULTS.accessTokenUrl,
    userIdUrl: env.userIdUrl || GARMIN_DEFAULTS.userIdUrl,
    activitiesUrl: env.activitiesUrl || GARMIN_DEFAULTS.activitiesUrl,
  };
}

function credentials(env: GarminEnv, token?: StravaTokenSet | null): OAuth1Credentials {
  return {
    consumerKey: env.consumerKey!,
    consumerSecret: env.consumerSecret!,
    token: token?.accessToken,
    tokenSecret: token?.refreshToken,
  };
}

export function mapGarminActivity(raw: GarminSummary): ActivitySample | null {
  const sport: CategorySlug | null = mapSportToCategory(raw.activityType ?? "");
  if (!sport || raw.startTimeInSeconds == null) return null;
  const externalId = String(raw.summaryId ?? raw.activityId ?? raw.startTimeInSeconds);
  const movingSec = Math.max(0, Math.round(raw.durationInSeconds ?? 0));
  const distance = Math.max(0, raw.distanceInMeters ?? 0);
  const gps = sport !== "strength";
  return {
    id: `garmin-${externalId}`,
    provider: "garmin",
    externalId,
    categorySlug: sport,
    startedAt: new Date(raw.startTimeInSeconds * 1000).toISOString(),
    metricValue: gps ? distance : movingSec,
    movingSec,
    avgHr: raw.averageHeartRateInBeatsPerMinute ?? null,
    rawName: raw.activityName || raw.activityType || sport,
  };
}

export function isGarminCallbackUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "apis.garmin.com";
  } catch {
    return false;
  }
}

async function signedFetch(
  env: GarminEnv,
  method: string,
  url: string,
  token: StravaTokenSet | null,
  http: FitnessHttp,
  extra: Record<string, string> = {},
): Promise<Response> {
  const authorization = await oauth1AuthorizationHeader(
    method,
    url,
    credentials(env, token),
    extra,
  );
  return http.fetch(url, { method, headers: { Authorization: authorization } });
}

function memoryStore(): StravaStore {
  const bag = (globalThis as { __fbGarminMemory?: StravaStore }).__fbGarminMemory;
  if (bag) return bag;
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
  (globalThis as { __fbGarminMemory?: StravaStore }).__fbGarminMemory = store;
  return store;
}

export function createGarminProvider(
  env: GarminEnv = {},
  options: { store?: StravaStore; http?: FitnessHttp } = {},
): FitnessProvider & {
  completeOAuth(userId: string, verifier: string): Promise<FitnessAuthResult>;
  pullCallback(userId: string, callbackUrl: string): Promise<ActivitySample[]>;
} {
  const store = options.store ?? memoryStore();
  const http = options.http ?? { fetch };
  const urls = endpoints(env);

  return {
    id: "garmin",
    displayName: "Garmin",
    async connect(userId) {
      if (!configured(env)) {
        await mockFitnessProvider.connect(userId);
        await store.setConnection({
          userId,
          provider: "garmin",
          connectedAt: new Date().toISOString(),
          status: "stub",
        });
        return {
          provider: "garmin",
          status: "stub",
          message:
            "Garmin API credentials missing. Set GARMIN_CONSUMER_KEY, GARMIN_CONSUMER_SECRET, and GARMIN_REDIRECT_URI after Garmin approves the app. FIT, GPX, and TCX import works without those keys.",
        };
      }
      const response = await signedFetch(
        env,
        "POST",
        urls.requestTokenUrl,
        null,
        http,
        { oauth_callback: env.redirectUri! },
      );
      if (!response.ok) throw new Error(`garmin_request_token_failed:${response.status}`);
      const body = parseOAuth1Body(await response.text());
      if (!body.oauth_token || !body.oauth_token_secret) {
        throw new Error("garmin_request_token_missing");
      }
      await store.setTokens(userId, {
        accessToken: body.oauth_token,
        refreshToken: body.oauth_token_secret,
        expiresAt: Math.floor(Date.now() / 1000) + 15 * 60,
      });
      const authorize = new URL(urls.authorizeUrl);
      authorize.searchParams.set("oauth_token", body.oauth_token);
      return {
        provider: "garmin",
        status: "disconnected",
        authorizeUrl: authorize.toString(),
        message: "Open authorizeUrl to approve Garmin.",
      };
    },
    async completeOAuth(userId, verifier) {
      if (!configured(env)) return this.connect(userId);
      const requestToken = await store.getTokens(userId);
      if (!requestToken) throw new Error("garmin_request_token_missing");
      const response = await signedFetch(
        env,
        "POST",
        urls.accessTokenUrl,
        requestToken,
        http,
        { oauth_verifier: verifier },
      );
      if (!response.ok) throw new Error(`garmin_access_token_failed:${response.status}`);
      const body = parseOAuth1Body(await response.text());
      if (!body.oauth_token || !body.oauth_token_secret) {
        throw new Error("garmin_access_token_missing");
      }
      const access: StravaTokenSet = {
        accessToken: body.oauth_token,
        refreshToken: body.oauth_token_secret,
        expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10,
      };
      const idResponse = await signedFetch(env, "GET", urls.userIdUrl, access, http);
      if (idResponse.ok) {
        const idBody = (await readJson(idResponse)) as { userId?: string };
        if (idBody.userId) access.athleteId = idBody.userId;
      }
      await store.setTokens(userId, access);
      await store.setConnection({
        userId,
        provider: "garmin",
        connectedAt: new Date().toISOString(),
        status: "connected",
      });
      return {
        provider: "garmin",
        status: "connected",
        message: "Garmin connected.",
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
          provider: "garmin",
          connectedAt: null,
          status: "disconnected",
        }
      );
    },
    async pullCallback(userId, callbackUrl) {
      if (!isGarminCallbackUrl(callbackUrl)) throw new Error("garmin_callback_rejected");
      const tokens = await store.getTokens(userId);
      if (!tokens) throw new Error("garmin_not_connected");
      const response = await signedFetch(env, "GET", callbackUrl, tokens, http);
      if (!response.ok) throw new Error(`garmin_callback_pull_failed:${response.status}`);
      const rows = (await readJson(response)) as GarminSummary[];
      return (Array.isArray(rows) ? rows : [])
        .map((item) => mapGarminActivity(item))
        .filter((item): item is ActivitySample => item != null);
    },
    async syncActivities(userId, options) {
      if (!configured(env)) {
        const mockSync = await mockFitnessProvider.syncActivities(userId, options);
        return {
          provider: "garmin" as const,
          activities: mockSync.activities.map((activity) => ({
            ...activity,
            provider: "garmin" as const,
            id: activity.id.replace(/^mock-/, "garmin-stub-"),
          })),
          syncedAt: new Date().toISOString(),
          usedMock: true,
        };
      }
      const connection = await store.getConnection(userId);
      if (!connection || connection.status !== "connected") {
        return {
          provider: "garmin" as const,
          activities: [],
          syncedAt: new Date().toISOString(),
          usedMock: false,
        };
      }
      const since = options?.since ?? syncWindow({ forceBackfill: true }).since;
      const start = Math.floor(new Date(since).getTime() / 1000);
      const end = Math.floor(Date.now() / 1000);
      const url = new URL(urls.activitiesUrl);
      url.searchParams.set("uploadStartTimeInSeconds", String(start));
      url.searchParams.set("uploadEndTimeInSeconds", String(end));
      const tokens = await store.getTokens(userId);
      if (!tokens) throw new Error("garmin_not_connected");
      const response = await signedFetch(env, "GET", url.toString(), tokens, http);
      if (!response.ok) throw new Error(`garmin_activities_failed:${response.status}`);
      const rows = (await readJson(response)) as GarminSummary[];
      let activities = (Array.isArray(rows) ? rows : [])
        .map((item) => mapGarminActivity(item))
        .filter((item): item is ActivitySample => item != null);
      if (options?.categorySlug) {
        activities = activities.filter((item) => item.categorySlug === options.categorySlug);
      }
      const syncedAt = new Date().toISOString();
      await store.setConnection({
        ...connection,
        lastSyncAt: syncedAt,
        lastActivityAt: activities.map((item) => item.startedAt).sort().at(-1) ?? null,
      });
      return {
        provider: "garmin" as const,
        activities,
        syncedAt,
        usedMock: false,
        since,
      };
    },
  };
}

export function garminAthleteExternalId(tokens: StravaTokenSet): string | null {
  return tokens.athleteId != null ? String(tokens.athleteId) : null;
}
