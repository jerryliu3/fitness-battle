import { serverEnv, webEnv } from "@/lib/env";
import { trackerRedirect } from "@/lib/oauth-callback";
import { getServerFitnessProvider } from "@/lib/fitness";
import { userIdForAccessToken } from "@/lib/fitness-store";
import { getSupabaseConfig } from "@/lib/supabase/config";

/** Garmin OAuth 1.0a callback. The request token identifies the user. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const oauthToken = url.searchParams.get("oauth_token");
  const verifier = url.searchParams.get("oauth_verifier");
  const denied = url.searchParams.get("oauth_problem") || url.searchParams.get("error");
  const hasCreds = Boolean(
    serverEnv.garminConsumerKey &&
      serverEnv.garminConsumerSecret &&
      serverEnv.garminRedirectUri,
  );
  const { configured } = getSupabaseConfig();
  const liveAuth = configured && !webEnv.useDemoData;

  if (!hasCreds || !liveAuth || denied) {
    return trackerRedirect(url.origin, "garmin", denied ? "error" : "stub");
  }
  if (!oauthToken || !verifier) {
    return trackerRedirect(url.origin, "garmin", "error");
  }

  const userId = await userIdForAccessToken("garmin", oauthToken);
  if (!userId) return trackerRedirect(url.origin, "garmin", "error");

  try {
    await getServerFitnessProvider("garmin").completeOAuth(userId, verifier);
    return trackerRedirect(url.origin, "garmin", "connected");
  } catch {
    return trackerRedirect(url.origin, "garmin", "error");
  }
}
