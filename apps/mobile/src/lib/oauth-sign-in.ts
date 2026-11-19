import { buildGoogleIdTokenAuthorizeUrl } from "@fitness-battle/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAppleSignInNonce } from "./apple-sign-in";
import { mobileEnv, publicProfileOrigin } from "./env";

export type ParsedOAuthReturnUrl = {
  code: string | null;
  idToken: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
};

/** Parse PKCE code, OIDC id_token, implicit session tokens, or OAuth error from the return URL. */
export function parseOAuthReturnUrl(url: string): ParsedOAuthReturnUrl {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
    const hashParams = new URLSearchParams(hash);
    const get = (key: string) => parsed.searchParams.get(key) ?? hashParams.get(key);

    const errorDescription = get("error_description");
    const errorCode = get("error");
    const error = errorDescription
      ? errorDescription.replace(/\+/g, " ")
      : errorCode;

    return {
      code: get("code"),
      idToken: get("id_token"),
      accessToken: get("access_token"),
      refreshToken: get("refresh_token"),
      error: error ?? null,
    };
  } catch {
    return { code: null, idToken: null, accessToken: null, refreshToken: null, error: null };
  }
}

/** Extract PKCE authorization code from the in-app browser return URL. */
export function authCodeFromOAuthReturnUrl(url: string): string | null {
  return parseOAuthReturnUrl(url).code;
}

export function isOAuthCallbackUrl(url: string): boolean {
  if (!url.startsWith("overtaek:")) return false;
  const parsed = parseOAuthReturnUrl(url);
  if (
    parsed.code ||
    parsed.idToken ||
    (parsed.accessToken && parsed.refreshToken) ||
    parsed.error
  ) {
    return true;
  }
  return url.includes("auth/callback");
}

export type ProviderOAuthDeps = {
  getRedirectUri: () => string;
  startOAuth: (
    provider: "google" | "apple",
    redirectTo: string,
  ) => Promise<{ url?: string | null; error?: string | null }>;
  createGoogleOAuthUrl?: () => Promise<{ url: string; rawNonce: string }>;
  openAuthSession: (
    url: string,
    returnUrl: string,
  ) => Promise<{ type: string; url?: string }>;
  exchangeCodeForSession: (code: string) => Promise<{ error?: string | null }>;
  signInWithIdToken?: (
    provider: "google" | "apple",
    token: string,
    rawNonce?: string,
  ) => Promise<{ error?: string | null }>;
  setSession?: (
    accessToken: string,
    refreshToken: string,
  ) => Promise<{ error?: string | null }>;
  onAppUrl?: (handler: (url: string) => void) => () => void;
  returnUrlWaitMs?: number;
};

export async function signInWithProviderOAuth(
  provider: "google" | "apple",
  deps: ProviderOAuthDeps,
): Promise<{ error?: string; cancelled?: boolean }> {
  const redirectTo = deps.getRedirectUri();
  let url: string | null | undefined;
  let rawNonce: string | undefined;

  if (provider === "google" && deps.createGoogleOAuthUrl) {
    const direct = await deps.createGoogleOAuthUrl();
    url = direct.url;
    rawNonce = direct.rawNonce;
  } else {
    const { url: oauthUrl, error: startError } = await deps.startOAuth(provider, redirectTo);
    if (startError) return { error: startError };
    url = oauthUrl;
  }

  if (!url) return { error: "Could not start sign-in." };

  let capturedUrl: string | null = null;
  let waiter: ((nextUrl: string | null) => void) | null = null;
  const stopWatching = deps.onAppUrl
    ? deps.onAppUrl((incomingUrl) => {
        if (!isOAuthCallbackUrl(incomingUrl)) return;
        capturedUrl = incomingUrl;
        if (waiter) {
          const resolve = waiter;
          waiter = null;
          resolve(incomingUrl);
        }
      })
    : null;

  let result: { type: string; url?: string };
  try {
    result = await deps.openAuthSession(url, redirectTo);
    if (
      (result.type === "cancel" || result.type === "dismiss") &&
      !capturedUrl &&
      stopWatching &&
      (deps.returnUrlWaitMs ?? 0) > 0
    ) {
      await new Promise<string | null>((resolve) => {
        waiter = resolve;
        setTimeout(() => {
          if (waiter === resolve) {
            waiter = null;
            resolve(capturedUrl);
          }
        }, deps.returnUrlWaitMs);
      });
    }
  } finally {
    stopWatching?.();
  }

  const returnUrl =
    result.type === "success" && result.url ? result.url : capturedUrl;

  if (!returnUrl) {
    if (result.type === "cancel" || result.type === "dismiss") {
      return { cancelled: true };
    }
    return { error: "Sign-in did not complete." };
  }

  const parsed = parseOAuthReturnUrl(returnUrl);
  if (parsed.error) return { error: parsed.error };

  if (parsed.idToken && deps.signInWithIdToken) {
    const { error: idTokenError } = await deps.signInWithIdToken(
      provider,
      parsed.idToken,
      rawNonce,
    );
    if (idTokenError) return { error: idTokenError };
    return {};
  }

  if (parsed.code) {
    const { error: exchangeError } = await deps.exchangeCodeForSession(parsed.code);
    if (exchangeError) return { error: exchangeError };
    return {};
  }

  if (parsed.accessToken && parsed.refreshToken && deps.setSession) {
    const { error: sessionError } = await deps.setSession(
      parsed.accessToken,
      parsed.refreshToken,
    );
    if (sessionError) return { error: sessionError };
    return {};
  }

  return { error: "Missing authorization code from sign-in." };
}

/** Deep link the in-app browser redirects to after OAuth completes. */
export function oauthCallbackRedirectUri(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { makeRedirectUri } = require("expo-auth-session") as typeof import("expo-auth-session");
  return makeRedirectUri({ scheme: "overtaek", path: "auth/callback" });
}

function defaultOnAppUrl(handler: (url: string) => void): () => void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Linking = require("expo-linking") as typeof import("expo-linking");
  const sub = Linking.addEventListener("url", (event) => {
    handler(event.url);
  });
  return () => sub.remove();
}

export function supabaseProviderOAuthDeps(client: SupabaseClient): ProviderOAuthDeps {
  return {
    getRedirectUri: oauthCallbackRedirectUri,
    createGoogleOAuthUrl: async () => {
      const { raw, hashed } = await createAppleSignInNonce();
      const url = buildGoogleIdTokenAuthorizeUrl({
        clientId: mobileEnv.googleClientId,
        redirectUri: `${publicProfileOrigin(mobileEnv.apiUrl)}/auth/google`,
        hashedNonce: hashed,
        state: { mobile: true },
      });
      return { url, rawNonce: raw };
    },
    startOAuth: async (provider, redirectTo) => {
      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      return { url: data?.url, error: error?.message ?? null };
    },
    openAuthSession: async (url, returnUrl) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const WebBrowser = require("expo-web-browser") as typeof import("expo-web-browser");
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
    signInWithIdToken: async (provider, token, rawNonce) => {
      const { error } = await client.auth.signInWithIdToken({
        provider,
        token,
        nonce: rawNonce,
      });
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
