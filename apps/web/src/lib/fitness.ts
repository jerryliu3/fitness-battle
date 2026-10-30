import {
  createGarminProvider,
  createOuraProvider,
  createStravaProvider,
  createWhoopProvider,
  type FitnessProviderId,
  type GarminEnv,
  type OAuth2Env,
  type StravaEnv,
} from "@fitness-battle/shared";
import { getSupabaseConfig } from "./supabase/config";
import { serverEnv } from "./env";
import { createProviderStore } from "./fitness-store";

export const OAUTH_PROVIDER_IDS = ["strava", "garmin", "whoop", "oura"] as const;
export type OAuthProviderId = (typeof OAUTH_PROVIDER_IDS)[number];

export function isOAuthProvider(id: string): id is OAuthProviderId {
  return (OAUTH_PROVIDER_IDS as readonly string[]).includes(id);
}

export function isFitnessProviderId(id: string): id is FitnessProviderId {
  return (
    id === "strava" ||
    id === "mock" ||
    id === "garmin" ||
    id === "apple_health" ||
    id === "google_health" ||
    id === "whoop" ||
    id === "oura"
  );
}

function liveEnv<T>(value: T): T | Record<string, never> {
  return getSupabaseConfig().configured ? value : {};
}

type ServerFitnessProvider =
  | ReturnType<typeof createStravaProvider>
  | ReturnType<typeof createGarminProvider>
  | ReturnType<typeof createWhoopProvider>
  | ReturnType<typeof createOuraProvider>;

export function getServerFitnessProvider(provider?: "strava"): ReturnType<typeof createStravaProvider>;
export function getServerFitnessProvider(provider: "garmin"): ReturnType<typeof createGarminProvider>;
export function getServerFitnessProvider(provider: "whoop"): ReturnType<typeof createWhoopProvider>;
export function getServerFitnessProvider(provider: "oura"): ReturnType<typeof createOuraProvider>;
export function getServerFitnessProvider(provider: OAuthProviderId): ServerFitnessProvider;
export function getServerFitnessProvider(provider: OAuthProviderId = "strava"): ServerFitnessProvider {
  const store = createProviderStore(provider);
  if (getSupabaseConfig().configured && !store) {
    throw new Error("fitness_token_store_not_configured");
  }
  const options = store ? { store } : {};
  if (provider === "garmin") {
    const env = liveEnv<GarminEnv>({
      consumerKey: serverEnv.garminConsumerKey,
      consumerSecret: serverEnv.garminConsumerSecret,
      redirectUri: serverEnv.garminRedirectUri,
    });
    return createGarminProvider(env, options);
  }
  if (provider === "whoop") {
    const env = liveEnv<OAuth2Env>({
      clientId: serverEnv.whoopClientId,
      clientSecret: serverEnv.whoopClientSecret,
      redirectUri: serverEnv.whoopRedirectUri,
    });
    return createWhoopProvider(env, options);
  }
  if (provider === "oura") {
    const env = liveEnv<OAuth2Env>({
      clientId: serverEnv.ouraClientId,
      clientSecret: serverEnv.ouraClientSecret,
      redirectUri: serverEnv.ouraRedirectUri,
    });
    return createOuraProvider(env, options);
  }
  const env = liveEnv<StravaEnv>({
    clientId: serverEnv.stravaClientId,
    clientSecret: serverEnv.stravaClientSecret,
    redirectUri: serverEnv.stravaRedirectUri,
  });
  return createStravaProvider(env, options);
}
