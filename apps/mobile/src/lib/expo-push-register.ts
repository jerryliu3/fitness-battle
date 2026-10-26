import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export type ExpoRegistrationResult =
  | {
      ok: true;
      token: string;
      permissionStatus: "granted";
      stub: false;
    }
  | {
      ok: false;
      reason: "web" | "simulator" | "denied" | "missing_project" | "token_error";
      message: string;
    };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function projectId(): string | null {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    null
  );
}

/**
 * Request OS permission and fetch a live Expo push token.
 * Falls back to the caller’s stub path on simulators / Expo web / errors.
 */
export async function registerExpoPushToken(): Promise<ExpoRegistrationResult> {
  if (Platform.OS === "web") {
    return {
      ok: false,
      reason: "web",
      message: "Expo Push tokens are for iOS/Android builds. Use the web app’s browser notifications.",
    };
  }

  if (!Device.isDevice) {
    return {
      ok: false,
      reason: "simulator",
      message: "Push tokens require a physical device. Using a stub token in the simulator.",
    };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Overtaek",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#B7F255",
    });
  }

  let status: Notifications.PermissionStatus;
  try {
    const existing = await Notifications.getPermissionsAsync();
    status = existing.status;
    if (status !== "granted") {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
  } catch {
    return {
      ok: false,
      reason: "denied",
      message: "Notification permission was not granted.",
    };
  }
  if (status !== "granted") {
    return {
      ok: false,
      reason: "denied",
      message: "Notification permission was not granted.",
    };
  }

  const id = projectId();
  if (!id) {
    return {
      ok: false,
      reason: "missing_project",
      message: "EAS projectId missing from app config.",
    };
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
    return {
      ok: true,
      token,
      permissionStatus: "granted",
      stub: false,
    };
  } catch (error) {
    return {
      ok: false,
      reason: "token_error",
      message:
        error instanceof Error
          ? error.message
          : "Could not fetch an Expo push token.",
    };
  }
}
