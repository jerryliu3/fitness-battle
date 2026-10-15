import { serverEnv, webEnv } from "@/lib/env";
import { trackerRedirect } from "@/lib/oauth-callback";
import { resolveSessionUserId } from "@/lib/auth/request-user";
import { getServerFitnessProvider } from "@/lib/fitness";
import { resolveOAuthCallbackUserId } from "@/lib/oauth-state";
import { getSupabaseConfig } from "@/lib/supabase/config";

/**
 * Strava OAuth callback.
 * Live mode exchanges the code when `state` is a signed ticket (mobile Safari)
 * or matches the browser session user. Demo mode never stores tokens here.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const hasCreds = Boolean(
    serverEnv.stravaClientId &&
      serverEnv.stravaClientSecret &&
      serverEnv.stravaRedirectUri,
  );
  const { configured } = getSupabaseConfig();
  const liveAuth = configured && !webEnv.useDemoData;

  if (!hasCreds || !code) {
    return trackerRedirect(url.origin, "strava", "stub");
  }
  if (!liveAuth) {
    return trackerRedirect(url.origin, "strava", "stub");
  }

  const sessionUserId = await resolveSessionUserId();
  const userId = await resolveOAuthCallbackUserId({
    state,
    provider: "strava",
    sessionUserId,
  });
  if (!userId) {
    return trackerRedirect(url.origin, "strava", "error");
  }

  const provider = getServerFitnessProvider("strava");
  try {
    await provider.completeOAuth(userId, code);
    return trackerRedirect(url.origin, "strava", "connected");
  } catch {
    return trackerRedirect(url.origin, "strava", "error");
  }
}
