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

export type TrackerOutcome = "connected" | "stub" | "error";

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
  /** Android dismiss race: wait briefly for the OAuth deep link. */
  waitForReturnUrl?: (
    matches: (url: string) => boolean,
    timeoutMs: number,
  ) => Promise<string | null>;
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
      trackerRaw === "connected" || trackerRaw === "stub" || trackerRaw === "error"
        ? trackerRaw
        : undefined;
    const provider =
      providerRaw && isCloudOAuthProvider(providerRaw) ? providerRaw : undefined;
    return { tracker, provider };
  } catch {
    return {};
  }
}

function defaultWaitForReturnUrl(
  matches: (url: string) => boolean,
  timeoutMs: number,
): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (url: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sub.remove();
      resolve(url);
    };
    // Lazy require so Vitest can unit-test without loading react-native.
    const Linking = require("expo-linking") as typeof import("expo-linking");
    const sub = Linking.addEventListener("url", (event) => {
      if (matches(event.url)) finish(event.url);
    });
    const timer = setTimeout(() => finish(null), timeoutMs);
    void Linking.getInitialURL().then((url) => {
      if (url && matches(url)) finish(url);
    });
  });
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
      // Lazy require so Vitest can unit-test without loading native modules.
      const WebBrowser = require("expo-web-browser") as typeof import("expo-web-browser");
      return WebBrowser.openAuthSessionAsync(authorizeUrl, returnUrl);
    },
    waitForReturnUrl: defaultWaitForReturnUrl,
  };
}

async function resolveAuthSession(
  authorizeUrl: string,
  deps: StartCloudTrackerConnectDeps,
): Promise<AuthSessionResult> {
  let session: AuthSessionResult;
  try {
    session = await deps.openAuthSession(authorizeUrl, AUTH_RETURN_URL);
  } catch {
    return { type: "error" };
  }

  if (session.type === "success" && session.url && isAuthReturnUrl(session.url)) {
    return session;
  }

  // Android's Custom Tabs polyfill often resolves `dismiss` before the Linking
  // redirect is delivered, even when OAuth succeeded.
  if (session.type === "cancel" || session.type === "dismiss" || session.type === "success") {
    const wait = deps.waitForReturnUrl ?? defaultWaitForReturnUrl;
    const linked = await wait(isAuthReturnUrl, 2000);
    if (linked) return { type: "success", url: linked };
  }

  return session;
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
    const session = await resolveAuthSession(body.authorizeUrl, deps);
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

    if (session.type === "success" && session.url) {
      const outcome = outcomeFromReturnUrl(session.url);
      const tracker = outcome.tracker;
      const resolvedProvider = outcome.provider ?? provider;
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
          message: "Credentials are not set, so this link is a demo stub.",
        };
      }
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
      message: body.message ?? "Demo tracker linked. This is not a live connection.",
    };
  }

  return {
    ok: false,
    message: body.message ?? "Connect did not return an authorize URL.",
  };
}
