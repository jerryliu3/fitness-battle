import type { ActivitySample, CategorySlug, FitnessConnection } from "../types";
import { mockFitnessProvider } from "./mock-provider";
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

const connections = new Map<string, FitnessConnection>();

function hasCredentials(env: StravaEnv): boolean {
  return Boolean(env.clientId && env.clientSecret && env.redirectUri);
}

function mapSportToCategory(sportType: string): CategorySlug {
  const normalized = sportType.toLowerCase();
  if (normalized.includes("ride") || normalized.includes("cycle")) {
    return "cycling";
  }
  if (normalized.includes("walk") || normalized.includes("hike")) {
    return "walking";
  }
  if (normalized.includes("weight") || normalized.includes("strength")) {
    return "strength";
  }
  return "running";
}

/**
 * Strava OAuth + activity sync surface.
 * When client credentials are missing, connect/sync fall back to the mock provider
 * while keeping provider id semantics clear in the response.
 */
export function createStravaProvider(env: StravaEnv = {}): FitnessProvider {
  return {
    id: "strava",
    displayName: "Strava",
    async connect(userId) {
      if (!hasCredentials(env)) {
        const mock = await mockFitnessProvider.connect(userId);
        connections.set(userId, {
          userId,
          provider: "strava",
          connectedAt: new Date().toISOString(),
          status: "stub",
        });
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

      connections.set(userId, {
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
    async disconnect(userId) {
      connections.delete(userId);
    },
    async getConnection(userId) {
      return (
        connections.get(userId) ?? {
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

      // Real Strava token exchange + athlete activities belong behind server routes
      // once OAuth tokens are stored. Placeholder keeps the surface compile-ready.
      void mapSportToCategory;
      return {
        provider: "strava",
        activities: [],
        syncedAt: new Date().toISOString(),
        usedMock: false,
      };
    },
  };
}
