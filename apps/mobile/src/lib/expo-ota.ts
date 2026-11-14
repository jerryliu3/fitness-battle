import * as Updates from "expo-updates";

/** Check Expo Update CDN, download if newer, and reload before product UI mounts. */
export async function applyExpoUpdateOnLaunch(): Promise<void> {
  if (__DEV__ || !Updates.isEnabled) return;
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return;
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  } catch (error) {
    console.warn(
      "Overtaek OTA: update check failed",
      error instanceof Error ? error.message : error,
    );
  }
}