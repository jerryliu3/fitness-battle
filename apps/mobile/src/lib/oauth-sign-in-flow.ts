export type ParsedOAuthReturnUrl = {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
};

/** Parse PKCE code, implicit session tokens, or OAuth error from the return URL. */
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
      accessToken: get("access_token"),
      refreshToken: get("refresh_token"),
      error: error ?? null,
    };
  } catch {
    return { code: null, accessToken: null, refreshToken: null, error: null };
  }
}

/** Extract PKCE authorization code from the in-app browser return URL. */
export function authCodeFromOAuthReturnUrl(url: string): string | null {
  return parseOAuthReturnUrl(url).code;
}

export function isOAuthCallbackUrl(url: string): boolean {
  if (!url.startsWith("overtaek:")) return false;
  const parsed = parseOAuthReturnUrl(url);
  if (parsed.code || (parsed.accessToken && parsed.refreshToken) || parsed.error) {
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
  openAuthSession: (
    url: string,
    returnUrl: string,
  ) => Promise<{ type: string; url?: string }>;
  exchangeCodeForSession: (code: string) => Promise<{ error?: string | null }>;
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
  const { url, error: startError } = await deps.startOAuth(provider, redirectTo);
  if (startError) return { error: startError };
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
