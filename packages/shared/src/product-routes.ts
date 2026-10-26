/**
 * Web product shell lives under `/app` so `/` can host marketing.
 * Native Expo routes stay at `/today`, `/arena`, etc.
 */

export const WEB_PRODUCT_PREFIX = "/app";

export function webProductPath(path: string): string {
  if (!path.startsWith("/")) return path;
  if (path === WEB_PRODUCT_PREFIX || path.startsWith(`${WEB_PRODUCT_PREFIX}/`)) {
    return path;
  }
  return `${WEB_PRODUCT_PREFIX}${path}`;
}

/** Strip `/app` for tab matching and legacy path comparisons. */
export function stripWebProductPrefix(path: string): string {
  const pathname = path.split("?")[0]?.split("#")[0]?.replace(/\/+$/, "") || "/";
  if (pathname === WEB_PRODUCT_PREFIX) return "/";
  if (pathname.startsWith(`${WEB_PRODUCT_PREFIX}/`)) {
    return pathname.slice(WEB_PRODUCT_PREFIX.length) || "/";
  }
  return pathname;
}
