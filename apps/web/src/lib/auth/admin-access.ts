export const DEFAULT_ADMIN_EMAILS = [
  "3jerryliu@gmail.com",
  "alice@example.com",
] as const;

/**
 * Returns the set of all authorized admin emails in lowercase.
 * Configurable via `ADMIN_EMAILS` environment variable (comma-separated list).
 */
export function getAdminEmails(): Set<string> {
  const emails = new Set<string>(DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase()));
  const envEmails = typeof process !== "undefined" ? process.env?.ADMIN_EMAILS : undefined;
  if (envEmails) {
    for (const item of envEmails.split(",")) {
      const clean = item.trim().toLowerCase();
      if (clean) emails.add(clean);
    }
  }
  return emails;
}

/**
 * Checks whether an email matches an authorized admin.
 * Case-insensitive and trimmed.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getAdminEmails().has(email.trim().toLowerCase());
}

/**
 * Normalizes a path string for robust matching:
 * - strips hash and query parameters
 * - URL decodes percent-encoded characters
 * - collapses multiple slashes
 * - strips trailing slashes (except root '/')
 */
export function normalizeAdminPath(pathname: string): string {
  if (!pathname) return "";
  let normalized = pathname.toLowerCase().split("?")[0].split("#")[0];
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Keep raw string if URI decoding fails
  }
  normalized = normalized.replace(/\/+/g, "/");
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

/**
 * Checks whether a given pathname targets admin UI routes:
 * - /admin, /admin/*
 * - /app/admin, /app/admin/*
 */
export function isAdminPath(pathname: string): boolean {
  const normalized = normalizeAdminPath(pathname);
  return (
    normalized === "/admin" ||
    normalized.startsWith("/admin/") ||
    normalized === "/app/admin" ||
    normalized.startsWith("/app/admin/")
  );
}

/**
 * Checks whether a user is authorized for admin privileges.
 *
 * Rules:
 * - User email must be a recognized admin email (e.g. 3jerryliu@gmail.com, alice@example.com).
 * - Production: Strictly requires verified account, never demo mode.
 * - Local: Also strictly requires the user to match an admin email. Demo cookies on local
 *   are only accepted if the email is an authorized admin email.
 */
export function isAuthorizedForAdmin(input: {
  email?: string | null;
  mode?: "supabase" | "demo";
  isLocal: boolean;
}): boolean {
  if (!input.email) return false;
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!isAdminEmail(normalizedEmail)) return false;

  // In production, demo mode is strictly disallowed
  if (!input.isLocal && input.mode === "demo") {
    return false;
  }

  return true;
}
