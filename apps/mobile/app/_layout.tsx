import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  useFonts as useDmSans,
} from "@expo-google-fonts/dm-sans";
import { NunitoSans_900Black, useFonts as useNunito } from "@expo-google-fonts/nunito-sans";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider } from "heroui-native/provider";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";
// Registers the foreground notification handler.
import "../src/lib/expo-push-register";
import { CompeteProvider } from "../src/lib/compete-store";
import { SHELL_COLORS } from "../src/theme";
import { BootGate } from "../src/ui/boot-gate";

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
  const [nunitoLoaded] = useNunito({ NunitoSans_900Black });
  const fontsLoaded = dmLoaded && nunitoLoaded;

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

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#1a0f22",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#ffcf47" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: SHELL_COLORS.paper }}>
      <HeroUINativeProvider>
        <CompeteProvider>
          <BootGate>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: SHELL_COLORS.paper },
                animation: "fade",
              }}
            />
          </BootGate>
        </CompeteProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
