/** Re-export shared boot gate so web and mobile share the force-complete rule. */
export { isCompeteDataReady, shouldShowBootSplash } from "@fitness-battle/shared/boot";

const BOOT_SEEN_KEY = "fb-boot-splash-seen";

export function hasSeenBootSplash(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(BOOT_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markBootSplashSeen(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(BOOT_SEEN_KEY, "1");
  } catch {}
}

