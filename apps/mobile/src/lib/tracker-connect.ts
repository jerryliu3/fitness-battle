import { mobileEnv } from "./env";
import { supabase } from "./supabase";

export const CLOUD_OAUTH_PROVIDERS = ["strava", "garmin", "whoop", "oura"] as const;
export type CloudOAuthProvider = (typeof CLOUD_OAUTH_PROVIDERS)[number];

export function isCloudOAuthProvider(id: string): id is CloudOAuthProvider {
  return (CLOUD_OAUTH_PROVIDERS as readonly string[]).includes(id);
}

export type CloudConnectResult = {
  ok: boolean;
  stub?: boolean;
  openedBrowser?: boolean;
  message: string;
};

export type StartCloudTrackerConnectDeps = {
  apiUrl: string;
  getAccessToken: () => Promise<string | undefined>;
  fetchFn: typeof fetch;
  openUrl: (url: string) => Promise<void>;
};

function defaultDeps(): StartCloudTrackerConnectDeps {
  return {
    apiUrl: mobileEnv.apiUrl,
    getAccessToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token;
    },
    fetchFn: fetch,
    openUrl: async (url) => {
      // Lazy require so Vitest can unit-test without loading react-native.
      const { Linking } = require("react-native") as typeof import("react-native");
      await Linking.openURL(url);
    },
  };
}

/**
 * Start cloud tracker OAuth from the phone: call the web API, then open the
 * system browser on the provider authorize page. Callbacks return via
 * `overtaek://you` when the app is installed.
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
    try {
      await deps.openUrl(body.authorizeUrl);
      return {
        ok: true,
        openedBrowser: true,
        message: "Continue in your browser, then return to Overtaek.",
      };
    } catch {
      return { ok: false, message: "Could not open the browser to finish connect." };
    }
  }

  if (body.status === "stub") {
    return {
      ok: true,
      stub: true,
      message: body.message ?? "Demo tracker linked. This is not a live connection.",
    };
  }

  return {
    ok: false,
    message: body.message ?? "Connect did not return an authorize URL.",
  };
}
