import { routeMetadata } from "./activity-files";
import type { ActivitySample, CategorySlug, FitnessConnection } from "../types";
import type { FitnessHttp } from "./http";
import { readJson } from "./http";
import { mockFitnessProvider } from "./mock-provider";
import { encodeForm } from "./http";
import { mapSportToCategory, type StravaStore, type StravaTokenSet } from "./strava-provider";
import type { FitnessAuthResult, FitnessProvider } from "./types";

export interface GarminEnv {
  consumerKey?: string;
  consumerSecret?: string;
  redirectUri?: string;
  authorizeUrl?: string;
  accessTokenUrl?: string;
  userIdUrl?: string;
  activitiesUrl?: string;
}

export const GARMIN_DEFAULTS = {
  authorizeUrl: "https://connect.garmin.com/oauth2Confirm",
  accessTokenUrl: "https://diauth.garmin.com/di-oauth2-service/oauth/token",
  userIdUrl: "https://apis.garmin.com/wellness-api/rest/user/id",
  activitiesUrl: "https://apis.garmin.com/wellness-api/rest/activities",
};

export interface GarminSummary {
  summaryId?: string;
  activityId?: string | number;
  activityName?: string;
  activityType?: string;
  startTimeInSeconds?: number;
  durationInSeconds?: number;
  distanceInMeters?: number;
  averageHeartRateInBeatsPerMinute?: number;
  startingLatitudeInDegree?: number;
  startingLongitudeInDegree?: number;
  manual?: boolean;
  totalElevationGainInMeters?: number;
  samples?: {
    latitudeInDegree?: number;
    longitudeInDegree?: number;
    startTimeInSeconds?: number;
    elevationInMeters?: number;
    heartRate?: number;
    speedMetersPerSecond?: number;
    stepsPerMinute?: number;
    bikeCadenceInRPM?: number;
  }[];
}

function configured(env: GarminEnv): boolean {
  return Boolean(env.consumerKey && env.consumerSecret && env.redirectUri);
}

function endpoints(env: GarminEnv) {
  return {
    authorizeUrl: env.authorizeUrl || GARMIN_DEFAULTS.authorizeUrl,
    accessTokenUrl: env.accessTokenUrl || GARMIN_DEFAULTS.accessTokenUrl,
    userIdUrl: env.userIdUrl || GARMIN_DEFAULTS.userIdUrl,
    activitiesUrl: env.activitiesUrl || GARMIN_DEFAULTS.activitiesUrl,
  };
}

export function mapGarminActivity(raw: GarminSummary): ActivitySample | null {
  const sport: CategorySlug | null = mapSportToCategory((raw.activityType ?? "").replace(/^(indoor_|virtual_|treadmill_)/i, ""));
  if (!sport || raw.startTimeInSeconds == null) return null;
  const externalId = String(raw.activityId ?? raw.summaryId?.replace(/-(detail|file)$/, "") ?? raw.startTimeInSeconds);
  const movingSec = Math.max(0, Math.round(raw.durationInSeconds ?? 0));
  const distance = Math.max(0, raw.distanceInMeters ?? 0);
  const gps = sport !== "strength";
  const indoor = /treadmill|indoor|virtual|elliptical/i.test(`${raw.activityType ?? ""} ${raw.activityName ?? ""}`);
  const route = gps && !indoor && !raw.manual ? routeMetadata((raw.samples ?? []).flatMap(sample => {
    const lat = sample.latitudeInDegree, lon = sample.longitudeInDegree;
    if (typeof lat !== "number" || typeof lon !== "number" || (lat === 0 && lon === 0)) return [];
    return [{ lat, lon, time: sample.startTimeInSeconds == null || !Number.isFinite(sample.startTimeInSeconds) || Math.abs(sample.startTimeInSeconds * 1000) > 8.64e15 ? undefined : new Date(sample.startTimeInSeconds * 1000).toISOString(),
      elevation: sample.elevationInMeters, heartRate: sample.heartRate, speedMps: sample.speedMetersPerSecond, cadence: sport === "cycling" ? sample.bikeCadenceInRPM : sample.stepsPerMinute, cadenceUnit: sport === "cycling" ? "rpm" as const : "spm" as const }];
  }), sport) : {};
  const lat = raw.startingLatitudeInDegree, lon = raw.startingLongitudeInDegree;
  const hasStart = typeof lat === "number" && typeof lon === "number" && Number.isFinite(lat) && Number.isFinite(lon)
    && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && (lat !== 0 || lon !== 0);
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
    verified: gps && !indoor && !raw.manual && (hasStart || Boolean(route.summaryPolyline)),
    ...route,
    ...(Number.isFinite(raw.totalElevationGainInMeters) ? { elevationGainM: Math.max(0, raw.totalElevationGainInMeters!) } : {}),
  };
}

export function isGarminCallbackUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "apis.garmin.com" && !url.port && !url.username && !url.password;
  } catch {
    return false;
  }
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
  completeOAuth(userId: string, code: string, verifier: string): Promise<FitnessAuthResult>;
  pullCallback(userId: string, callbackUrl: string): Promise<ActivitySample[]>;
  downloadActivityFile(userId: string, callbackUrl: string): Promise<Response>;
} {
  const store = options.store ?? memoryStore();
  const http = options.http ?? { fetch };
  const urls = endpoints(env);

  async function tokenRequest(fields: Record<string, string>): Promise<StravaTokenSet> {
    const response = await http.fetch(urls.accessTokenUrl, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encodeForm({ client_id: env.consumerKey!, client_secret: env.consumerSecret!, ...fields }),
    });
    if (!response.ok) throw new Error(`garmin_token_failed:${response.status}`);
    const body = await readJson(response) as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!body?.access_token || !body.refresh_token || !body.expires_in) throw new Error("garmin_token_missing");
    return { accessToken: body.access_token, refreshToken: body.refresh_token, expiresAt: Math.floor(Date.now() / 1000) + body.expires_in };
  }
  async function access(userId: string): Promise<StravaTokenSet> {
    const existing = await store.getTokens(userId);
    if (!existing) throw new Error("garmin_not_connected");
    // Legacy OAuth 1 tokens were stored with a ten-year synthetic expiry.
    if (existing.expiresAt > Math.floor(Date.now() / 1000) + 365 * 86400) throw new Error("garmin_reconnect_required");
    if (existing.expiresAt * 1000 > Date.now() + 600_000) return existing;
    const next = await tokenRequest({ grant_type: "refresh_token", refresh_token: existing.refreshToken });
    next.athleteId = existing.athleteId;
    await store.setTokens(userId, next);
    return next;
  }
  async function bearer(url: string, token: StravaTokenSet, method = "GET") {
    return http.fetch(url, { method, redirect: "error", headers: { Authorization: `Bearer ${token.accessToken}` } });
  }

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
      const authorize = new URL(urls.authorizeUrl);
      authorize.searchParams.set("client_id", env.consumerKey!);
      authorize.searchParams.set("redirect_uri", env.redirectUri!);
      authorize.searchParams.set("response_type", "code");
      authorize.searchParams.set("state", userId);
      return {
        provider: "garmin",
        status: "disconnected",
        authorizeUrl: authorize.toString(),
        message: "Open authorizeUrl to approve Garmin.",
      };
    },
    async completeOAuth(userId, code, verifier) {
      if (!configured(env)) throw new Error("garmin_not_configured");
      const tokens = await tokenRequest({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: env.redirectUri! });
      const idResponse = await bearer(urls.userIdUrl, tokens);
      if (!idResponse.ok) throw new Error(`garmin_user_id_failed:${idResponse.status}`);
      const idBody = await readJson(idResponse) as { userId?: string };
      if (!idBody?.userId) throw new Error("garmin_user_id_missing");
      tokens.athleteId = idBody.userId;
      await store.setTokens(userId, tokens);
      await store.setConnection({ userId, provider: "garmin", connectedAt: new Date().toISOString(), status: "connected" });
      return { provider: "garmin", status: "connected", message: "Garmin connected." };
    },
    async disconnect(userId) {
      const existing = await store.getTokens(userId);
      if (existing && configured(env)) {
        const response = await bearer("https://apis.garmin.com/wellness-api/rest/user/registration", await access(userId), "DELETE");
        if (!response.ok && response.status !== 404) throw new Error(`garmin_disconnect_failed:${response.status}`);
      }
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
    async downloadActivityFile(userId, callbackUrl) {
      if (!isGarminCallbackUrl(callbackUrl) || new URL(callbackUrl).pathname !== "/wellness-api/rest/activityFile") throw new Error("garmin_callback_rejected");
      const tokens = await access(userId);
      return http.fetch(callbackUrl, { redirect: "error", headers: { Authorization: `Bearer ${tokens.accessToken}` }, signal: AbortSignal.timeout(30_000) });
    },
    async pullCallback(userId, callbackUrl) {
      if (!isGarminCallbackUrl(callbackUrl)) throw new Error("garmin_callback_rejected");
      const tokens = await access(userId);
      const response = await bearer(callbackUrl, tokens);
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
      // Starter accounts receive new activities via push; ad-hoc pull and
      // historical backfill are available only with Enterprise access.
      return {
        provider: "garmin" as const,
        activities: [],
        syncedAt: new Date().toISOString(),
        usedMock: false,
      };
    },
  };
}

export function garminAthleteExternalId(tokens: StravaTokenSet): string | null {
  return tokens.athleteId != null ? String(tokens.athleteId) : null;
}
