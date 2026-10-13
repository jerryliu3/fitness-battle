import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const publicEnv = (typeof process !== "undefined" ? process.env : {}) as Record<
  string,
  string | undefined
>;

function read(key: string, fallback = ""): string {
  return publicEnv[key] ?? extra[key] ?? fallback;
}

const supabaseUrl =
  read("EXPO_PUBLIC_SUPABASE_URL") ||
  extra.supabaseUrl ||
  "http://127.0.0.1:54321";
const supabaseAnonKey =
  read("EXPO_PUBLIC_SUPABASE_ANON_KEY") ||
  extra.supabaseAnonKey ||
  "public-anon-key";

function isConfiguredSupabase(url: string, key: string) {
  if (!url || !key) return false;
  if (url.includes("127.0.0.1") || url.includes("localhost")) return false;
  if (key === "public-anon-key" || key.startsWith("your-")) return false;
  return true;
}

export const mobileEnv = {
  supabaseUrl,
  supabaseAnonKey,
  supabaseConfigured: isConfiguredSupabase(supabaseUrl, supabaseAnonKey),
  useDemoData: (read("EXPO_PUBLIC_USE_DEMO_DATA", "true").toLowerCase() !== "false"),
  stravaClientId: read("EXPO_PUBLIC_STRAVA_CLIENT_ID") || undefined,
  stravaRedirectUri:
    read("EXPO_PUBLIC_STRAVA_REDIRECT_URI") || "fitnessbattle://strava",
  apiUrl: read("EXPO_PUBLIC_API_URL") || extra.apiUrl || "http://localhost:3000",
  rankingsSupabaseUrl: read("EXPO_PUBLIC_RANKINGS_SUPABASE_URL"),
  rankingsSupabaseAnonKey: read("EXPO_PUBLIC_RANKINGS_SUPABASE_ANON_KEY"),
};
