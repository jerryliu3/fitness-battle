import * as Updates from "expo-updates";

/** Prefetch Expo updates in the background; apply on the next cold launch. */
export async function applyExpoUpdateOnLaunch(): Promise<void> {
  if (__DEV__ || !Updates.isEnabled) return;
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return;
    await Updates.fetchUpdateAsync();
  } catch (error) {
    console.warn(
      "Overtaek OTA: update check failed",
      error instanceof Error ? error.message : error,
    );
  }
}