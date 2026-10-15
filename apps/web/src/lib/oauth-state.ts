import { createHmac, timingSafeEqual } from "node:crypto";

const STATE_TTL_MS = 15 * 60 * 1000;

type OAuthStatePayload = {
  u: string;
  p: string;
  e: number;
};

/** Read secrets at call time so tests and deploys see current env. */
function signingSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.STRAVA_CLIENT_SECRET ||
    process.env.WHOOP_CLIENT_SECRET ||
    process.env.OURA_CLIENT_SECRET ||
    "dev-oauth-state"
  );
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

function signBody(body: string): string {
  return b64url(createHmac("sha256", signingSecret()).update(body).digest());
}

/** Opaque OAuth `state` so callbacks work without a browser cookie (mobile Safari). */
export function signOAuthState(userId: string, provider: string, now = Date.now()): string {
  const payload: OAuthStatePayload = {
    u: userId,
    p: provider,
    e: now + STATE_TTL_MS,
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${signBody(body)}`;
}

export function verifyOAuthState(
  state: string,
  provider: string,
  now = Date.now(),
): string | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expected = signBody(body);
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
    return payload.u;
  } catch {
    return null;
  }
}

/**
 * Resolve the user for an OAuth2 callback.
 * Prefer signed state (mobile / cookie-less Safari). Fall back to session + raw user id state (older web links).
 */
export async function resolveOAuthCallbackUserId(options: {
  state: string | null;
  provider: string;
  sessionUserId: string | null;
}): Promise<string | null> {
  const { state, provider, sessionUserId } = options;
  if (!state) return null;
  const signed = verifyOAuthState(state, provider);
  if (signed) {
    if (sessionUserId && sessionUserId !== signed) return null;
    return signed;
  }
  if (sessionUserId && state === sessionUserId) return sessionUserId;
  return null;
}

/** Rewrite `state` on an authorize URL after the shared provider builds it. */
export function withSignedOAuthState(
  authorizeUrl: string | undefined,
  userId: string,
  provider: string,
): string | undefined {
  if (!authorizeUrl) return undefined;
  try {
    const url = new URL(authorizeUrl);
    if (!url.searchParams.has("state")) return authorizeUrl;
    url.searchParams.set("state", signOAuthState(userId, provider));
    return url.toString();
  } catch {
    return authorizeUrl;
  }
}
