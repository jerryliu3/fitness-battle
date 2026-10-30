import { serverEnv } from "@/lib/env";
import { trackerRedirectForRequest } from "@/lib/oauth-callback";
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
  const liveAuth = configured;

  if (!hasCreds || !code) {
    return trackerRedirectForRequest(request, "strava", "stub");
  }
  if (!liveAuth) {
    return trackerRedirectForRequest(request, "strava", "stub");
  }

  const sessionUserId = await resolveSessionUserId();
  const userId = resolveOAuthCallbackUserId({
    state,
    provider: "strava",
    sessionUserId,
  });
  if (!userId) {
    return trackerRedirectForRequest(request, "strava", "error");
  }

  const provider = getServerFitnessProvider("strava");
  try {
    await provider.completeOAuth(userId, code);
    return trackerRedirectForRequest(request, "strava", "connected");
  } catch {
    return trackerRedirectForRequest(request, "strava", "error");
  }
}
