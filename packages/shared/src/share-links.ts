import { webProductPath } from "./product-routes";

/** Canonical marketing origin for HTTPS share links in production. */
export const PUBLIC_SHARE_ORIGIN = "https://overtaek.xyz";

export function crewInviteHttpsUrl(origin: string, code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return origin.replace(/\/$/, "");
  const base = origin.replace(/\/$/, "");
  return `${base}/invite?invite=${encodeURIComponent(trimmed)}`;
}

export function crewInviteWebDestination(code: string): string {
  const trimmed = code.trim();
  const params = new URLSearchParams(trimmed ? { invite: trimmed } : {});
  const qs = params.toString();
  return qs ? `${webProductPath("/field")}?${qs}` : webProductPath("/field");
}

/** Expo Router path opened by universal links for crew invites. */
export function crewInviteNativePath(code: string): string {
  const trimmed = code.trim();
  const params = new URLSearchParams(trimmed ? { invite: trimmed } : {});
  const qs = params.toString();
  return qs ? `/invite?${qs}` : "/invite";
}

export function publicAthleteHttpsUrl(origin: string, athleteId: string): string {
  const trimmed = athleteId.trim();
  if (!trimmed) return origin.replace(/\/$/, "");
  const base = origin.replace(/\/$/, "");
  return `${base}/athlete?id=${encodeURIComponent(trimmed)}`;
}

export function publicAthleteWebDestination(athleteId: string): string {
  const trimmed = athleteId.trim();
  const params = new URLSearchParams(trimmed ? { id: trimmed } : {});
  const qs = params.toString();
  return qs ? `${webProductPath("/athlete")}?${qs}` : webProductPath("/athlete");
}

/** Native full-screen public profile route. */
export function publicAthleteNativePath(athleteId: string): string {
  const trimmed = athleteId.trim();
  const params = new URLSearchParams(trimmed ? { id: trimmed } : {});
  const qs = params.toString();
  return qs ? `/athlete-profile?${qs}` : "/athlete-profile";
}

export function nativeAppDeepLink(pathAndQuery: string): string {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery.slice(1) : pathAndQuery;
  return `overtaek://${path}`;
}