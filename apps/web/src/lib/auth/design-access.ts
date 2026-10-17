/**
 * Access control utilities for routes scoped under /design/ and /ux/.
 *
 * Rules:
 * - Production: ONLY accessible by signed-in user specifically 3jerryliu@gmail.com.
 *   Demo cookies / spoofed demo accounts are strictly rejected in production.
 * - Local: Accessible by 3jerryliu@gmail.com OR one of the demo accounts
 *   (seed demo accounts, demo mode sessions, etc.).
 * - Unauthenticated users are redirected to /login with next target.
 * - Authenticated unauthorized users are redirected away (e.g. /today).
 */

export const OWNER_EMAIL = "3jerryliu@gmail.com";
export const DEMO_USER_COOKIE = "fb_demo_user";

export const LOCAL_DEMO_EMAILS = new Set([
  "alice@example.com",
  "bob@example.com",
  "carla@example.com",
  "dana@example.com",
]);

/**
 * Checks whether an email matches the project owner (Jerry Liu).
 * Case-insensitive and trimmed.
 */
export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === OWNER_EMAIL.toLowerCase();
}

/**
 * Checks whether a user account qualifies as a demo account on local.
 */
export function isDemoAccount(input: {
  email?: string | null;
  mode?: string;
}): boolean {
  if (input.mode === "demo") return true;
  const email = input.email?.trim().toLowerCase();
  if (!email) return false;
  if (LOCAL_DEMO_EMAILS.has(email)) return true;
  if (email.endsWith("@example.com") || email.endsWith("@demo.local")) return true;
  const localPart = email.split("@")[0] || "";
  if (/(?:^|[._+-])demo(?:[._+-]|$)/i.test(localPart)) {
    return true;
  }
  return false;
}

/**
 * Checks whether a given pathname is scoped under /design or /ux.
 * Normalizes leading slashes, path separators, query parameters, and URL encoding.
 */
export function isDesignOrUxPath(pathname: string): boolean {
  if (!pathname) return false;
  let normalized = pathname.toLowerCase().split("?")[0].split("#")[0];
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Keep raw string if URI decoding fails
  }
  normalized = normalized.replace(/\/+/g, "/");

  return (
    normalized === "/design" ||
    normalized.startsWith("/design/") ||
    normalized === "/ux" ||
    normalized.startsWith("/ux/") ||
    normalized === "/api/design" ||
    normalized.startsWith("/api/design/") ||
    normalized === "/api/ux" ||
    normalized.startsWith("/api/ux/")
  );
}

/**
 * Checks if a hostname or host is a local loopback / private dev domain.
 */
export function isLocalHost(hostOrHostname?: string | null): boolean {
  if (!hostOrHostname) return false;
  let host = hostOrHostname.toLowerCase().trim();
  // Strip IPv6 brackets: [::1]:3000 -> ::1
  if (host.startsWith("[")) {
    const closingBracket = host.indexOf("]");
    if (closingBracket !== -1) {
      host = host.slice(1, closingBracket);
    }
  } else if (host.includes(":") && host.indexOf(":") === host.lastIndexOf(":")) {
    // Exactly one colon: host:port
    host = host.split(":")[0];
  }
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local")
  );
}

/**
 * Determines whether the environment is local development/testing vs remote production.
 * Any cloud deployment (e.g. Vercel) or remote domain is strictly non-local.
 */
export function isLocalEnvironment(options?: {
  hostname?: string | null;
  nodeEnv?: string;
  vercelEnv?: string;
  isVercel?: boolean | string;
}): boolean {
  const isVercel = options?.isVercel ?? process.env.VERCEL;
  const vercelEnv = options?.vercelEnv ?? process.env.VERCEL_ENV;
  if (isVercel === "1" || isVercel === true || (vercelEnv && vercelEnv !== "development")) {
    return false;
  }
  if (options?.hostname) {
    return isLocalHost(options.hostname);
  }
  const nodeEnv = options?.nodeEnv ?? process.env.NODE_ENV;
  return nodeEnv === "development" || nodeEnv === "test";
}

/**
 * Authorizes a user for design / UX routes according to environment.
 */
export function isAuthorizedForDesign({
  email,
  mode,
  isLocal,
}: {
  email?: string | null;
  mode?: "supabase" | "demo";
  isLocal: boolean;
}): boolean {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();

  // Local environment: owner or any demo account
  if (isLocal) {
    if (isOwnerEmail(normalizedEmail)) return true;
    return isDemoAccount({ email: normalizedEmail, mode });
  }

  // Production: strictly owner, never demo mode
  if (mode === "demo") return false;
  return isOwnerEmail(normalizedEmail);
}

/**
 * Parses demo user info stored in the client cookie.
 */
export function parseDemoUserFromCookie(cookieValue?: string | null): {
  id: string;
  email: string;
  displayName?: string;
  mode: "demo";
} | null {
  if (!cookieValue) return null;
  let raw = cookieValue.trim();
  if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) {
    raw = raw.slice(1, -1);
  }
  try {
    raw = decodeURIComponent(raw);
    const parsed = typeof raw === "string" ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.email === "string" && parsed.email.trim()) {
      return {
        id: String(parsed.id || ""),
        email: parsed.email.trim().toLowerCase(),
        displayName: parsed.displayName ? String(parsed.displayName) : undefined,
        mode: "demo",
      };
    }
    return null;
  } catch {
    return null;
  }
}


/**
 * Serializes demo user info to store in a cookie on client side.
 */
export function serializeDemoUserCookie(user: {
  id: string;
  email: string;
  displayName?: string;
}): string {
  return encodeURIComponent(
    JSON.stringify({
      id: user.id,
      email: user.email.trim().toLowerCase(),
      displayName: user.displayName,
      mode: "demo",
    }),
  );
}
