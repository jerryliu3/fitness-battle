import { PROVIDERS, type Provider, type ProviderId } from "@fitness-battle/shared";
import { Platform } from "react-native";

/** Device-only trackers that belong on one OS. */
const IOS_ONLY = new Set<ProviderId>(["apple_health"]);
const ANDROID_ONLY = new Set<ProviderId>(["google_health"]);

/**
 * Trackers shown on this phone. Apple Health is iOS-only; Health Connect is
 * Android-only. Cloud OAuth providers stay visible on every platform.
 */
export function providersForDevice(): Provider[] {
  const os = Platform.OS;
  return PROVIDERS.filter((provider) => {
    if (IOS_ONLY.has(provider.id)) return os === "ios";
    if (ANDROID_ONLY.has(provider.id)) return os === "android";
    return true;
  });
}
