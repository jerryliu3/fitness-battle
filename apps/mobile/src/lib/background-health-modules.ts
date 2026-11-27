import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

/** OTA JS can run on store binaries built before background health was added. */
function loadBackgroundHealthModules() {
  if (
    (Platform.OS !== "ios" && Platform.OS !== "android") ||
    !requireOptionalNativeModule("ExpoTaskManager") ||
    !requireOptionalNativeModule("ExpoBackgroundFetch")
  ) return null;

  // Keep these synchronous: defineTask must run during bundle initialization.
  // Static imports would throw on older binaries before the capability check.
  return {
    BackgroundFetch: require("expo-background-fetch") as typeof import("expo-background-fetch"),
    TaskManager: require("expo-task-manager") as typeof import("expo-task-manager"),
  };
}

export const backgroundHealthModules = loadBackgroundHealthModules();
