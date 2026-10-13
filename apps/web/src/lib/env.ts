/**
 * Env access for the web app.
 *
 * NEXT_PUBLIC_* values must be read with static `process.env.NEXT_PUBLIC_…`
 * property access so Next.js can inline them into the browser bundle.
 * Dynamic lookups like `process.env[name]` stay empty on the client, which
 * falls back to local placeholders, flips auth into demo mode, and hydrates
 * differently from the server (broken signup / React #418).
 */

/** Public / isomorphic env. Safe to import from client components. */
export const webEnv = {
  supabaseUrl:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key",
  useDemoData:
    (process.env.NEXT_PUBLIC_USE_DEMO_DATA ?? "true").toLowerCase() !== "false",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

/** Server-only secrets. Import only from Route Handlers / server modules. */
export const serverEnv = {
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  stravaClientId: process.env.STRAVA_CLIENT_ID,
  stravaClientSecret: process.env.STRAVA_CLIENT_SECRET,
  stravaRedirectUri:
    process.env.STRAVA_REDIRECT_URI ??
    "http://localhost:3000/api/fitness/strava/callback",
  whoopClientId: process.env.WHOOP_CLIENT_ID,
  whoopClientSecret: process.env.WHOOP_CLIENT_SECRET,
  whoopRedirectUri:
    process.env.WHOOP_REDIRECT_URI ??
    "http://localhost:3000/api/fitness/whoop/callback",
  ouraClientId: process.env.OURA_CLIENT_ID,
  ouraClientSecret: process.env.OURA_CLIENT_SECRET,
  ouraRedirectUri:
    process.env.OURA_REDIRECT_URI ??
    "http://localhost:3000/api/fitness/oura/callback",
  garminConsumerKey: process.env.GARMIN_CONSUMER_KEY,
  garminConsumerSecret: process.env.GARMIN_CONSUMER_SECRET,
  garminRedirectUri:
    process.env.GARMIN_REDIRECT_URI ??
    "http://localhost:3000/api/fitness/garmin/callback",
};
