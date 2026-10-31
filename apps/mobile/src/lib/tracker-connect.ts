import { mobileEnv } from "./env";
import { supabase } from "./supabase";

export const CLOUD_OAUTH_PROVIDERS = ["strava", "garmin", "whoop", "oura"] as const;
export type CloudOAuthProvider = (typeof CLOUD_OAUTH_PROVIDERS)[number];

/**
 * Prefix passed to openAuthSessionAsync. Must match both `overtaek:///you`
 * and `overtaek://you` (Android sometimes normalizes the slash count).
 */
export const AUTH_RETURN_URL = "overtaek://";

export function isCloudOAuthProvider(id: string): id is CloudOAuthProvider {
  return (CLOUD_OAUTH_PROVIDERS as readonly string[]).includes(id);
}

export type TrackerOutcome = "connected" | "stub" | "error" | "already_linked";

export type CloudConnectResult = {
  ok: boolean;
  stub?: boolean;
  cancelled?: boolean;
  /** Auth session returned to the app with an outcome. */
  tracker?: TrackerOutcome;
  provider?: CloudOAuthProvider;
  message: string;
};

export type AuthSessionResult = {
  type: string;
  url?: string;
};

export type StartCloudTrackerConnectDeps = {
  apiUrl: string;
  getAccessToken: () => Promise<string | undefined>;
  fetchFn: typeof fetch;
  openAuthSession: (
    authorizeUrl: string,
    returnUrl: string,
  ) => Promise<AuthSessionResult>;
  /** Subscribe to app URL opens for the duration of an auth attempt. */
  onAppUrl?: (handler: (url: string) => void) => () => void;
  /** How long to wait after dismiss/cancel for a late Android deep link. */
  returnUrlWaitMs?: number;
};

export function isAuthReturnUrl(url: string): boolean {
  if (!url.startsWith("overtaek:")) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname || parsed.host || "";
    const path = parsed.pathname.replace(/\/+$/, "");
    return host === "you" || path === "/you" || path === "you";
  } catch {
    return /overtaek:\/+you(\?|$)/.test(url);
  }
}

/** Parse `overtaek:///you?tracker=…&provider=…` (or host-style deep links). */
export function outcomeFromReturnUrl(url: string): {
  tracker?: TrackerOutcome;
  provider?: CloudOAuthProvider;
} {
  try {
    const parsed = new URL(url);
    const trackerRaw = parsed.searchParams.get("tracker");
    const providerRaw = parsed.searchParams.get("provider");
    const tracker =
      trackerRaw === "connected" || trackerRaw === "stub" || trackerRaw === "error" || trackerRaw === "already_linked"
        ? trackerRaw
        : undefined;
    const provider =
      providerRaw && isCloudOAuthProvider(providerRaw) ? providerRaw : undefined;
    return { tracker, provider };
  } catch {
    return {};
  }
}

/** Return URL for this attempt — ignores other providers' deep links. */
export function isReturnUrlForProvider(
  url: string,
  expectedProvider: CloudOAuthProvider,
): boolean {
  if (!isAuthReturnUrl(url)) return false;
  const { provider } = outcomeFromReturnUrl(url);
  return provider == null || provider === expectedProvider;
}

function defaultOnAppUrl(handler: (url: string) => void): () => void {
  // Lazy require so Vitest can unit-test without loading native modules.
  const Linking = require("expo-linking") as typeof import("expo-linking");
  const sub = Linking.addEventListener("url", (event) => {
    handler(event.url);
  });
  return () => sub.remove();
}

function watchReturnUrls(
  expectedProvider: CloudOAuthProvider,
  onAppUrl: (handler: (url: string) => void) => () => void,
) {
  let latest: string | null = null;
  let waiter: ((url: string | null) => void) | null = null;

  const stop = onAppUrl((url) => {
    if (!isReturnUrlForProvider(url, expectedProvider)) return;
    latest = url;
    if (waiter) {
      const resolve = waiter;
      waiter = null;
      resolve(url);
    }
  });

  return {
    take(): string | null {
      return latest;
    },
    wait(timeoutMs: number): Promise<string | null> {
      if (latest) return Promise.resolve(latest);
      return new Promise((resolve) => {
        waiter = resolve;
        setTimeout(() => {
          if (waiter !== resolve) return;
          waiter = null;
          resolve(latest);
        }, timeoutMs);
      });
    },
    stop,
  };
}

function defaultDeps(): StartCloudTrackerConnectDeps {
  return {
    apiUrl: mobileEnv.apiUrl,
    getAccessToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token;
    },
    fetchFn: fetch,
    openAuthSession: async (authorizeUrl, returnUrl) => {
      const WebBrowser = require("expo-web-browser") as typeof import("expo-web-browser");
      return WebBrowser.openAuthSessionAsync(authorizeUrl, returnUrl);
    },
    onAppUrl: defaultOnAppUrl,
  };
}

async function resolveAuthSession(
  authorizeUrl: string,
  provider: CloudOAuthProvider,
  deps: StartCloudTrackerConnectDeps,
): Promise<AuthSessionResult> {
  const onAppUrl = deps.onAppUrl ?? defaultOnAppUrl;
  // Listen before opening the sheet so Android redirects delivered during the
  // session are not missed. Do not read getInitialURL — that can be a stale
  // cold-start deep link from an earlier OAuth attempt.
  const watch = watchReturnUrls(provider, onAppUrl);

  try {
    let session: AuthSessionResult;
    try {
      session = await deps.openAuthSession(authorizeUrl, AUTH_RETURN_URL);
    } catch {
      return { type: "error" };
    }

    if (
      session.type === "success" &&
      session.url &&
      isReturnUrlForProvider(session.url, provider)
    ) {
      return session;
    }

    const buffered = watch.take();
    if (buffered) return { type: "success", url: buffered };

    // Android Custom Tabs often resolves `dismiss` before Linking delivers the
    // redirect. Keep listening briefly after the sheet closes.
    if (session.type === "cancel" || session.type === "dismiss" || session.type === "success") {
      const late = await watch.wait(deps.returnUrlWaitMs ?? 2000);
      if (late) return { type: "success", url: late };
    }

    // Never hand a non-matching success URL to the caller — that would mark the
    // wrong tracker connected after the wait timed out.
    if (session.type === "success") {
      return { type: "success" };
    }

    return session;
  } finally {
    watch.stop();
  }
}

function resultFromReturnUrl(
  url: string,
  fallbackProvider: CloudOAuthProvider,
): CloudConnectResult {
  const outcome = outcomeFromReturnUrl(url);
  const tracker = outcome.tracker;
  const resolvedProvider = outcome.provider ?? fallbackProvider;
  if (tracker === "connected") {
    return {
      ok: true,
      tracker,
      provider: resolvedProvider,
      message: `${resolvedProvider} connected.`,
    };
  }
  if (tracker === "stub") {
    return {
      ok: true,
      stub: true,
      tracker,
      provider: resolvedProvider,
      message: "Credentials are not set. Please try again later.",
    };
  }
  if (tracker === "already_linked") return { ok: false, tracker, provider: resolvedProvider, message: "This account is already linked to another Overtaek account. Contact support if this is unexpected." };
  if (tracker === "error") {
    return {
      ok: false,
      tracker,
      provider: resolvedProvider,
      message: "That tracker did not connect. Try again from the app.",
    };
  }
  return {
    ok: true,
    message: "Returned from authorize. Check tracker status in a moment.",
  };
}

/**
 * Start cloud tracker OAuth from the phone: call the web API, then open an
 * in-app auth session (ASWebAuthenticationSession / Chrome Custom Tabs) on the
 * provider authorize page. The HTTPS callback deep-links to `overtaek:///you`,
 * which closes the session and returns the outcome URL to the app.
 */
export async function startCloudTrackerConnect(
  provider: CloudOAuthProvider,
  deps: StartCloudTrackerConnectDeps = defaultDeps(),
): Promise<CloudConnectResult> {
  const token = await deps.getAccessToken();
  if (!token) {
    return { ok: false, message: "Sign in to connect a tracker." };
  }

  let response: Response;
  try {
    response = await deps.fetchFn(`${deps.apiUrl}/api/fitness/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ provider }),
    });
  } catch {
    return { ok: false, message: "Could not reach the connect API." };
  }

  const body = (await response.json().catch(() => ({}))) as {
    authorizeUrl?: string;
    message?: string;
    status?: string;
    error?: string;
  };

  if (!response.ok) {
    return {
      ok: false,
      message: body.error ?? "Could not start tracker connect.",
    };
  }

  if (body.authorizeUrl) {
    const session = await resolveAuthSession(body.authorizeUrl, provider, deps);
    if (session.type === "error") {
      return { ok: false, message: "Could not open the sign-in sheet to finish connect." };
    }

    if (session.type === "cancel" || session.type === "dismiss") {
      return {
        ok: false,
        cancelled: true,
        message: "Connect cancelled.",
      };
    }

    if (
      session.type === "success" &&
      session.url &&
      isReturnUrlForProvider(session.url, provider)
    ) {
      return resultFromReturnUrl(session.url, provider);
    }

    return {
      ok: false,
      message: "Authorize finished without a return URL. Try again.",
    };
  }

  if (body.status === "stub") {
    return {
      ok: true,
      stub: true,
      tracker: "stub",
      provider,
      message: body.message ?? "Tracker connected.",
    };
  }

  return {
    ok: false,
    message: body.message ?? "Connect did not return an authorize URL.",
  };
}
