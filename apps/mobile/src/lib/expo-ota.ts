import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { Alert, Linking, Platform } from "react-native";
import { mobileEnv } from "./env";
import { fetchWithTimeout } from "./fetch-with-timeout";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const OTA_PROMPT_KEY = "fb-ota-prompt-at:v1";
const STORE_PROMPT_KEY = "fb-store-version-prompt:v1";
const DEFAULT_IOS_STORE_URL = "itms-apps://apps.apple.com/app/id6822939070";

export function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) =>
    v
      .trim()
      .replace(/^v/i, "")
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(latest);
  const b = parse(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) return av > bv;
  }
  return false;
}

/** Prefetch Expo updates; prompt to restart at most once every 7 days. */
export async function applyExpoUpdateOnLaunch(now = Date.now()): Promise<void> {
  if (__DEV__ || !Updates.isEnabled) return;
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return;
    const fetched = await Updates.fetchUpdateAsync();
    if (fetched?.isNew === false) return;

    const lastRaw = await AsyncStorage.getItem(OTA_PROMPT_KEY).catch(() => null);
    const lastAt = lastRaw ? Number(lastRaw) : 0;
    if (Number.isFinite(lastAt) && lastAt > 0 && now - lastAt < SEVEN_DAYS_MS) return;

    await AsyncStorage.setItem(OTA_PROMPT_KEY, String(now)).catch(() => {});
    Alert.alert(
      "Update ready",
      "A new update is ready. Restart Overtaek to apply it.",
      [
        { text: "Later", style: "cancel" },
        { text: "Restart now", onPress: () => void Updates.reloadAsync() },
      ],
    );
  } catch (error) {
    console.warn(
      "Overtaek OTA: update check failed",
      error instanceof Error ? error.message : error,
    );
  }
}

/** Check for a newer App Store release; prompt at most once every 7 days per version. */
export async function checkStoreVersionOnLaunch(now = Date.now()): Promise<void> {
  if (__DEV__ || Platform.OS !== "ios") return;
  const currentVersion = Constants.expoConfig?.version;
  if (!currentVersion || !mobileEnv.apiUrl) return;
  try {
    const res = await fetchWithTimeout(`${mobileEnv.apiUrl}/api/app-version`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      latestVersion?: unknown;
      iosStoreUrl?: unknown;
    };
    if (typeof data.latestVersion !== "string") return;
    if (!isNewerVersion(data.latestVersion, currentVersion)) return;

    const raw = await AsyncStorage.getItem(STORE_PROMPT_KEY).catch(() => null);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { version?: string; at?: number };
        if (
          parsed.version === data.latestVersion &&
          typeof parsed.at === "number" &&
          now - parsed.at < SEVEN_DAYS_MS
        ) {
          return;
        }
      } catch {
        // Ignore malformed cache.
      }
    }

    await AsyncStorage.setItem(
      STORE_PROMPT_KEY,
      JSON.stringify({ version: data.latestVersion, at: now }),
    ).catch(() => {});

    const storeUrl =
      typeof data.iosStoreUrl === "string" && data.iosStoreUrl
        ? data.iosStoreUrl
        : DEFAULT_IOS_STORE_URL;

    Alert.alert(
      "New version available",
      `Overtaek ${data.latestVersion} is available on the App Store.`,
      [
        { text: "Later", style: "cancel" },
        { text: "Update", onPress: () => void Linking.openURL(storeUrl) },
      ],
    );
  } catch {
    // Best-effort check; stay silent on network errors.
  }
}
