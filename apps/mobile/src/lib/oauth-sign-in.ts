import type { SupabaseClient } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import type { ProviderOAuthDeps } from "./oauth-sign-in-flow";

export {
  authCodeFromOAuthReturnUrl,
  isOAuthCallbackUrl,
  parseOAuthReturnUrl,
  signInWithProviderOAuth,
  type ParsedOAuthReturnUrl,
  type ProviderOAuthDeps,
} from "./oauth-sign-in-flow";

/** Deep link Supabase redirects to after Google / Apple web OAuth. */
export function oauthCallbackRedirectUri(): string {
  return makeRedirectUri({ scheme: "overtaek", path: "auth/callback" });
}

function defaultOnAppUrl(handler: (url: string) => void): () => void {
  const sub = Linking.addEventListener("url", (event) => {
    handler(event.url);
  });
  return () => sub.remove();
}

export function supabaseProviderOAuthDeps(client: SupabaseClient): ProviderOAuthDeps {
  return {
    getRedirectUri: oauthCallbackRedirectUri,
    startOAuth: async (provider, redirectTo) => {
      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      return { url: data?.url, error: error?.message ?? null };
    },
    openAuthSession: async (url, returnUrl) => {
      const session = await WebBrowser.openAuthSessionAsync(url, returnUrl);
      return {
        type: session.type,
        url: session.type === "success" ? session.url : undefined,
      };
    },
    exchangeCodeForSession: async (code) => {
      const { error } = await client.auth.exchangeCodeForSession(code);
      return { error: error?.message ?? null };
    },
    setSession: async (accessToken, refreshToken) => {
      const { error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      return { error: error?.message ?? null };
    },
    onAppUrl: defaultOnAppUrl,
    returnUrlWaitMs: 1500,
  };
}
