import { DEFAULT_GOOGLE_WEB_CLIENT_ID } from "@fitness-battle/shared";
import Constants from "expo-constants";
import * as Device from "expo-device";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

/** Hosted web app used for API routes and embedded scenes (athlete card, arena, routes). */
export const DEFAULT_PRODUCTION_API_URL = "https://fitness-battle-one.vercel.app";

/** Public marketing site used in shareable profile links (not the dev API host). */
export const PUBLIC_WEB_ORIGIN = "https://overtaek.xyz";

export function publicProfileOrigin(apiUrl: string) {
  if (isLoopbackApiUrl(apiUrl)) return apiUrl.replace(/\/$/, "");
  return PUBLIC_WEB_ORIGIN;
}

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
  previewEffortBoost: process.env.NODE_ENV === "development" && process.env.EXPO_PUBLIC_PREVIEW_EFFORT_BOOST === "true",
  useDemoData:
    (
      process.env.EXPO_PUBLIC_USE_DEMO_DATA ??
      extra.useDemoData ??
      "true"
    ).toLowerCase() !== "false",
  stravaClientId: process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID,
  stravaRedirectUri:
    process.env.EXPO_PUBLIC_STRAVA_REDIRECT_URI || "overtaek://strava",
  apiUrl: resolveApiUrl(configuredApiUrl),
  mapboxAccessToken:
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ||
    extra.mapboxAccessToken?.trim() ||
    "",
  googleClientId:
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    extra.googleClientId?.trim() ||
    DEFAULT_GOOGLE_WEB_CLIENT_ID,
  posthogKey:
    process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim() ||
    extra.posthogKey?.trim() ||
    "",
  posthogHost:
    process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() ||
    extra.posthogHost?.trim() ||
    "https://us.i.posthog.com",
  sentryDsn:
    process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ||
    extra.sentryDsn?.trim() ||
    "",
  appEnv:
    process.env.EXPO_PUBLIC_APP_ENV?.trim() ||
    extra.appEnv?.trim() ||
    "",
};
