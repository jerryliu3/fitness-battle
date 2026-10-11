export const webEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key",
  stravaClientId: process.env.STRAVA_CLIENT_ID,
  stravaClientSecret: process.env.STRAVA_CLIENT_SECRET,
  stravaRedirectUri:
    process.env.STRAVA_REDIRECT_URI ??
    "http://localhost:3000/api/fitness/strava/callback",
  useDemoData:
    (process.env.NEXT_PUBLIC_USE_DEMO_DATA ?? "true").toLowerCase() !==
    "false",
};
