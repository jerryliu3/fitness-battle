import { serverEnv, webEnv } from "@/lib/env";
import { trackerRedirect } from "@/lib/oauth-callback";
import { resolveSessionUserId } from "@/lib/auth/request-user";
import { getServerFitnessProvider } from "@/lib/fitness";
import { getSupabaseConfig } from "@/lib/supabase/config";

/**
 * Strava OAuth callback.
 * Live mode exchanges the code only for the signed-in user, and only when
 * `state` matches that user. Demo mode never stores tokens from this URL.
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

  // Session cookie (web) or OAuth state (mobile browser return). State is the user id set at connect.
  const sessionUserId = await resolveSessionUserId();
  const userId = sessionUserId ?? state;
  if (!userId || !state || state !== userId) {
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
