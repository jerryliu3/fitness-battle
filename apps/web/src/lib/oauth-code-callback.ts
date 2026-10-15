import { serverEnv, webEnv } from "@/lib/env";
import { trackerRedirect } from "@/lib/oauth-callback";
import { resolveSessionUserId } from "@/lib/auth/request-user";
import { getServerFitnessProvider, type OAuthProviderId } from "@/lib/fitness";
import { resolveOAuthCallbackUserId } from "@/lib/oauth-state";
import { getSupabaseConfig } from "@/lib/supabase/config";

function creds(provider: "whoop" | "oura"): boolean {
  if (provider === "whoop") {
    return Boolean(
      serverEnv.whoopClientId && serverEnv.whoopClientSecret && serverEnv.whoopRedirectUri,
    );
  }
  return Boolean(
    serverEnv.ouraClientId && serverEnv.ouraClientSecret && serverEnv.ouraRedirectUri,
  );
}

export function oauthCodeCallback(providerId: OAuthProviderId) {
  return async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const { configured } = getSupabaseConfig();
    const liveAuth = configured && !webEnv.useDemoData;
    if (providerId !== "whoop" && providerId !== "oura") {
      return trackerRedirect(url.origin, providerId, "error");
    }
    if (!creds(providerId) || !code || !liveAuth) {
      return trackerRedirect(url.origin, providerId, "stub");
    }
    const sessionUserId = await resolveSessionUserId();
    const userId = resolveOAuthCallbackUserId({
      state,
      provider: providerId,
      sessionUserId,
    });
    if (!userId) {
      return trackerRedirect(url.origin, providerId, "error");
    }
    try {
      await getServerFitnessProvider(providerId).completeOAuth(userId, code);
      return trackerRedirect(url.origin, providerId, "connected");
    } catch {
      return trackerRedirect(url.origin, providerId, "error");
    }
  };
}
