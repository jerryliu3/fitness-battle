export const DEFAULT_ADMIN_EMAILS = [
  "3jerryliu@gmail.com",
  "alice@example.com",
] as const;

export const ADMIN_EMAILS = new Set<string>(
  DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase()),
);

/** Checks whether an email matches an authorized admin (case-insensitive & trimmed). */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (ADMIN_EMAILS.has(normalized)) return true;
  const env = typeof process !== "undefined" ? process.env?.ADMIN_EMAILS : undefined;
  return env ? env.split(",").some((e) => e.trim().toLowerCase() === normalized) : false;
}

/** Normalizes a path string: decodes percent-encoding, strips queries/hashes and extra slashes. */
export function normalizeAdminPath(pathname: string): string {
  let normalized = pathname?.toLowerCase().split(/[?#]/)[0] ?? "";
  try { normalized = decodeURIComponent(normalized); } catch {}
  normalized = normalized.replace(/\/+/g, "/");
  return normalized.length > 1 && normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

/** Checks whether a given pathname targets admin UI routes (/admin or /app/admin). */
export function isAdminPath(pathname: string): boolean {
  const p = normalizeAdminPath(pathname);
  return p === "/admin" || p.startsWith("/admin/") || p === "/app/admin" || p.startsWith("/app/admin/");
}

/** Verifies admin access: requires admin email and strictly rejects demo mode in production. */
export function isAuthorizedForAdmin(input: {
  email?: string | null;
  mode?: "supabase" | "demo";
  isLocal: boolean;
}): boolean {
  if (!isAdminEmail(input.email)) return false;
  return input.isLocal || input.mode !== "demo";
}
