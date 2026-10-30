import { serverEnv } from "@/lib/env";
import { trackerRedirectForRequest } from "@/lib/oauth-callback";
import { resolveSessionUserId } from "@/lib/auth/request-user";
import { getServerFitnessProvider } from "@/lib/fitness";
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

export function oauthCodeCallback(providerId: "whoop" | "oura") {
  return async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const { configured } = getSupabaseConfig();
    const liveAuth = configured;
    if (url.searchParams.has("error") || (creds(providerId) && liveAuth && !code)) {
      const reason = url.searchParams.get("error");
      console.warn("Provider authorization rejected", { provider: providerId, reason: reason && /^[a-z_]{1,60}$/.test(reason) ? reason : "missing_code" });
      return trackerRedirectForRequest(request, providerId, "error");
    }
    if (!creds(providerId) || !liveAuth) {
      return trackerRedirectForRequest(request, providerId, "stub");
    }
    if (!code) return trackerRedirectForRequest(request, providerId, "error");
    const sessionUserId = await resolveSessionUserId();
    const userId = resolveOAuthCallbackUserId({
      state,
      provider: providerId,
      sessionUserId,
    });
    if (!userId) {
      return trackerRedirectForRequest(request, providerId, "error");
    }
    try {
      if (providerId === "whoop") await getServerFitnessProvider("whoop").completeOAuth(userId, code);
      else await getServerFitnessProvider("oura").completeOAuth(userId, code);
      return trackerRedirectForRequest(request, providerId, "connected");
    } catch {
      return trackerRedirectForRequest(request, providerId, "error");
    }
  };
}
