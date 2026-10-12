import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const publicEnv = (typeof process !== "undefined" ? process.env : {}) as Record<
  string,
  string | undefined
>;

export const mobileEnv = {
  supabaseUrl:
    publicEnv.EXPO_PUBLIC_SUPABASE_URL ??
    extra.supabaseUrl ??
    "http://127.0.0.1:54321",
  supabaseAnonKey:
    publicEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    extra.supabaseAnonKey ??
    "public-anon-key",
  useDemoData:
    (publicEnv.EXPO_PUBLIC_USE_DEMO_DATA ?? "true").toLowerCase() !== "false",
  stravaClientId: publicEnv.EXPO_PUBLIC_STRAVA_CLIENT_ID,
  stravaRedirectUri: publicEnv.EXPO_PUBLIC_STRAVA_REDIRECT_URI,
};
