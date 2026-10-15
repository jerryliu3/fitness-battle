import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  useFonts as useDmSans,
} from "@expo-google-fonts/dm-sans";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
// Registers the foreground notification handler.
import "../src/lib/expo-push-register";
import { colors } from "../src/theme";

function pathFromNotificationResponse(
  response: Notifications.NotificationResponse,
): string | null {
  const data = response.notification.request.content.data as {
    path?: unknown;
  };
  return typeof data.path === "string" && data.path.startsWith("/")
    ? data.path
    : null;
}

export default function RootLayout() {
  const [dmLoaded] = useDmSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    let alive = true;
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!alive || !response) return;
      const path = pathFromNotificationResponse(response);
      if (path) router.push(path as "/settings");
    });
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const path = pathFromNotificationResponse(response);
        if (path) router.push(path as "/settings");
      },
    );
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  if (!dmLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.paper,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
          animation: "fade",
        }}
      />
    </>
  );
}
