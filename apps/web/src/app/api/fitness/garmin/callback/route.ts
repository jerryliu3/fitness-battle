import { serverEnv } from "@/lib/env";
import { trackerRedirectForRequest, trackerConnectFailure } from "@/lib/oauth-callback";
import { resolveSessionUserId } from "@/lib/auth/request-user";
import { getServerFitnessProvider } from "@/lib/fitness";
import { garminPkceVerifier, resolveOAuthCallbackUserId } from "@/lib/oauth-state";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!serverEnv.garminConsumerKey || !serverEnv.garminConsumerSecret || !getSupabaseConfig().configured || !code || !state) {
    return trackerRedirectForRequest(request, "garmin", "error");
  }
  const userId = resolveOAuthCallbackUserId({ state, provider: "garmin", sessionUserId: await resolveSessionUserId() });
  if (!userId) return trackerRedirectForRequest(request, "garmin", "error");
  try {
    await getServerFitnessProvider("garmin").completeOAuth(userId, code, garminPkceVerifier(state));
    return trackerRedirectForRequest(request, "garmin", "connected");
  } catch (error) {
    return trackerRedirectForRequest(request, "garmin", trackerConnectFailure(error));
  }
}
