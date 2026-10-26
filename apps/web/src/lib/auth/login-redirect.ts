import { webProductPath } from "@fitness-battle/shared";

const DEFAULT_POST_LOGIN_PATH = webProductPath("/today");
const LOGIN_PATH = "/login";
const SENTINEL_BASE_URL = "http://fitness-battle.local";

const PRODUCT_ROOTS = new Set([
  "today",
  "arena",
  "you",
  "field",
  "athlete",
  "onboarding",
  "week",
  "pace",
  "admin",
  "rankings",
]);

function withWebProductPrefix(safePath: string) {
  const resolved = new URL(safePath, SENTINEL_BASE_URL);
  const root = resolved.pathname.split("/").filter(Boolean)[0];
  if (!root || !PRODUCT_ROOTS.has(root)) {
    return safePath;
  }
  resolved.pathname = webProductPath(resolved.pathname);
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

function isSafeRelativePath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (path.includes("\\")) return false;
  try {
    const resolved = new URL(path, SENTINEL_BASE_URL);
    return resolved.origin === SENTINEL_BASE_URL;
  } catch {
    return false;
  }
}

function normalizeSafePath(path: string) {
  const resolved = new URL(path, SENTINEL_BASE_URL);
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

function isAuthPath(path: string) {
  return (
    path === LOGIN_PATH ||
    path.startsWith(`${LOGIN_PATH}/`) ||
    path === "/signup" ||
    path.startsWith("/signup/")
  );
}

export function resolveSafePostLoginPath(candidatePath?: string | null) {
  const normalized = candidatePath?.trim();
  if (!normalized || !isSafeRelativePath(normalized)) {
    return DEFAULT_POST_LOGIN_PATH;
  }
  const safePath = normalizeSafePath(normalized);
  const pathname = new URL(safePath, SENTINEL_BASE_URL).pathname;
  if (pathname === "/" || isAuthPath(pathname)) return DEFAULT_POST_LOGIN_PATH;
  return withWebProductPrefix(safePath);
}

export function buildLoginHref(nextPath?: string | null) {
  const safeNextPath = resolveSafePostLoginPath(nextPath);
  const query = new URLSearchParams({ next: safeNextPath });
  return `/login?${query.toString()}`;
}

export function buildSignupHref(nextPath?: string | null) {
  const safeNextPath = resolveSafePostLoginPath(nextPath);
  const query = new URLSearchParams({ next: safeNextPath });
  return `/signup?${query.toString()}`;
}
