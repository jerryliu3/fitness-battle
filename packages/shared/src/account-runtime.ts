import { DEMO_ACCOUNTS } from "./demo-data";

/** Data provenance is informational and never authorizes access. */
export function accountDataOrigin(id: string): "synthetic" | "recorded" {
  return DEMO_ACCOUNTS.some(account => account.id === id) || /^a11ce000-0000-4000-8000-00000000000[1-6]$/.test(id) ? "synthetic" : "recorded";
}

export function isSupabaseConfigured(url: string, anonKey: string): boolean {
  if (!url || !anonKey) return false;
  if (anonKey === "public-anon-key" || anonKey === "your-anon-key") return false;
  if (url.includes("127.0.0.1") || url.includes("localhost")) {
    // Local Supabase is fine when the anon key is a real JWT-shaped secret.
    return anonKey.length > 40;
  }
  return url.startsWith("https://") && anonKey.length > 20;
}

export function resolveAuthDisplayName(
  userMetadata?: Record<string, unknown> | null,
  email?: string | null,
): string {
  for (const key of ["display_name", "full_name", "name"] as const) {
    const val = userMetadata?.[key];
    if (typeof val === "string" && val.trim()) return val.trim().slice(0, 80);
  }
  const emailPrefix = email?.split("@")[0]?.trim();
  return emailPrefix ? emailPrefix.slice(0, 80) : "Athlete";
}

export const DEFAULT_GOOGLE_WEB_CLIENT_ID =
  "386925478638-2sap7j47alldo5t4dn832p109m72226j.apps.googleusercontent.com";

export const GOOGLE_NONCE_STORAGE_KEY = "overtaek-google-oauth-nonce-v1";

export type GoogleOAuthState = {
  next?: string;
  from?: "onboarding" | "signup";
  mobile?: boolean;
};

export function buildGoogleIdTokenAuthorizeUrl(input: {
  clientId?: string;
  redirectUri: string;
  hashedNonce: string;
  state?: GoogleOAuthState;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId?.trim() || DEFAULT_GOOGLE_WEB_CLIENT_ID,
    redirect_uri: input.redirectUri,
    response_type: "id_token",
    scope: "openid email profile",
    nonce: input.hashedNonce,
    prompt: "select_account",
  });
  if (input.state) {
    params.set("state", JSON.stringify(input.state));
  }
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
