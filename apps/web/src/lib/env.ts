/**
 * NEXT_PUBLIC_* must use static `process.env.NEXT_PUBLIC_…` access so Next
 * inlines them into the client bundle. Dynamic `process.env[name]` stays empty
 * in the browser and forces demo-auth fallbacks.
 */

/** Public / isomorphic env. Safe to import from client components. */
export const webEnv = {
  supabaseUrl:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54621",
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key",
  useDemoData:
    (process.env.NEXT_PUBLIC_USE_DEMO_DATA ?? "false").toLowerCase() === "true",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

/** Server-only secrets. Import only from Route Handlers / server modules. */
export const serverEnv = {
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  issueReportFrom: process.env.ISSUE_REPORT_FROM ?? "",
  issueReportTo: process.env.ISSUE_REPORT_TO ?? "support@overtaek.com",
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
  /**
   * Optional Expo access token for the Push API
   * (https://expo.dev/accounts/[account]/settings/access-tokens).
   * Not required for basic sends; improves attribution and limits.
   */
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN ?? "",
};
