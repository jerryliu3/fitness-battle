/** Re-export shared boot gate so web and mobile share the force-complete rule. */
export { isCompeteDataReady, shouldShowBootSplash } from "@fitness-battle/shared/boot";

const BOOT_SEEN_KEY = "fb-boot-splash-seen";

export function hasSeenBootSplash(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(BOOT_SEEN_KEY) === "1") return true;
    if (sessionStorage.getItem(BOOT_SEEN_KEY) === "1") {
      localStorage.setItem(BOOT_SEEN_KEY, "1");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function markBootSplashSeen(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BOOT_SEEN_KEY, "1");
    sessionStorage.setItem(BOOT_SEEN_KEY, "1");
  } catch {}
}

