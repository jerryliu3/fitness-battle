function read(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

/** Public / isomorphic env. Safe to import from client components. */
export const webEnv = {
  supabaseUrl: read("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321"),
  supabaseAnonKey: read("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key"),
  useDemoData:
    (process.env.NEXT_PUBLIC_USE_DEMO_DATA ?? "true").toLowerCase() !== "false",
  appUrl: read("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
};

/** Server-only secrets. Import only from Route Handlers / server modules. */
export const serverEnv = {
  supabaseServiceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),
  stravaClientId: process.env.STRAVA_CLIENT_ID,
  stravaClientSecret: process.env.STRAVA_CLIENT_SECRET,
  stravaRedirectUri: read(
    "STRAVA_REDIRECT_URI",
    "http://localhost:3000/api/fitness/strava/callback",
  ),
};
