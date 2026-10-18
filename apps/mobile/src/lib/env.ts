import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

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
  apiUrl:
    process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? "http://localhost:3000",
};
