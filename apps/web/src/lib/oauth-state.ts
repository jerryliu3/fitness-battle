import { createHmac, timingSafeEqual } from "node:crypto";

const STATE_TTL_MS = 15 * 60 * 1000;

/** How connect authenticated — drives whether the callback needs a browser cookie. */
export type OAuthStateChannel = "bearer" | "session";

type OAuthStatePayload = {
  u: string;
  p: string;
  e: number;
  /** Absent on very old tickets → treat as session-bound. */
  c?: OAuthStateChannel;
};

function providerSecret(provider: string): string | undefined {
  switch (provider) {
    case "strava":
      return process.env.STRAVA_CLIENT_SECRET;
    case "whoop":
      return process.env.WHOOP_CLIENT_SECRET;
    case "oura":
      return process.env.OURA_CLIENT_SECRET;
    default:
      return undefined;
  }
}

/** Prefer the live provider secret (always present when authorizeUrl is real). */
function signingSecret(provider: string): string {
  const secret = providerSecret(provider) || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing OAuth signing secret for ${provider} in production.`);
    }
    return "dev-oauth-state";
  }
  return secret;
}

function b64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function signBody(provider: string, body: string): string {
  return b64url(createHmac("sha256", signingSecret(provider)).update(body).digest());
}

/** Opaque OAuth `state` so mobile Safari can finish without a web cookie. */
export function signOAuthState(
  userId: string,
  provider: string,
  channel: OAuthStateChannel,
  now = Date.now(),
): string {
  const payload: OAuthStatePayload = {
    u: userId,
    p: provider,
    e: now + STATE_TTL_MS,
    c: channel,
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${signBody(provider, body)}`;
}

export function verifyOAuthState(
  state: string,
  provider: string,
  now = Date.now(),
): OAuthStatePayload | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expected = signBody(provider, body);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as OAuthStatePayload;
    if (
      typeof payload.u !== "string" ||
      !payload.u ||
      payload.p !== provider ||
      typeof payload.e !== "number" ||
      payload.e < now
    ) {
      return null;
    }
    if (payload.c != null && payload.c !== "bearer" && payload.c !== "session") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Resolve the user for an OAuth2 callback.
 * - `bearer` channel (mobile): trust signed state; Safari often has no / wrong cookie.
 * - `session` channel (web): require the browser session to match (CSRF bind).
 * - Raw user-id state: legacy web links; session must match.
 */
export function resolveOAuthCallbackUserId(options: {
  state: string | null;
  provider: string;
  sessionUserId: string | null;
}): string | null {
  const { state, provider, sessionUserId } = options;
  if (!state) return null;
  const signed = verifyOAuthState(state, provider);
  if (signed) {
    const channel = signed.c ?? "session";
    if (channel === "bearer") return signed.u;
    if (sessionUserId && sessionUserId === signed.u) return signed.u;
    return null;
  }
  if (sessionUserId && state === sessionUserId) return sessionUserId;
  return null;
}

/** Rewrite `state` on an authorize URL after the shared provider builds it. */
export function withSignedOAuthState(
  authorizeUrl: string | undefined,
  userId: string,
  provider: string,
  channel: OAuthStateChannel,
): string | undefined {
  if (!authorizeUrl) return undefined;
  try {
    const url = new URL(authorizeUrl);
    if (!url.searchParams.has("state")) return authorizeUrl;
    url.searchParams.set("state", signOAuthState(userId, provider, channel));
    return url.toString();
  } catch {
    return authorizeUrl;
  }
}
