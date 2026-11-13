import Constants from "expo-constants";
import * as Device from "expo-device";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

/** Hosted web app used for API routes and embedded scenes (athlete card, arena, routes). */
export const DEFAULT_PRODUCTION_API_URL = "https://fitness-battle-one.vercel.app";

function isLoopbackApiUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

/** Physical devices cannot reach the dev machine at localhost; use the hosted app instead. */
function resolveApiUrl(configured: string) {
  if (Device.isDevice && isLoopbackApiUrl(configured)) return DEFAULT_PRODUCTION_API_URL;
  return configured;
}

const configuredApiUrl =
  process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? "http://localhost:3000";

export const mobileEnv = {
  supabaseUrl:
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    extra.supabaseUrl ??
    "http://127.0.0.1:54621",
  supabaseAnonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    extra.supabaseAnonKey ??
    "public-anon-key",
  useDemoData:
    (process.env.EXPO_PUBLIC_USE_DEMO_DATA ?? "true").toLowerCase() !== "false",
  stravaClientId: process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID,
  stravaRedirectUri:
    process.env.EXPO_PUBLIC_STRAVA_REDIRECT_URI || "overtaek://strava",
  apiUrl: resolveApiUrl(configuredApiUrl),
  mapboxAccessToken:
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ||
    extra.mapboxAccessToken?.trim() ||
    "",
};
