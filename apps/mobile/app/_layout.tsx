import { useThemeColors } from "../src/theme";
import { textStyle } from "../src/ui/section";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  useFonts as useDmSans,
} from "@expo-google-fonts/dm-sans";
import {
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold,
  Manrope_700Bold, Manrope_800ExtraBold, useFonts as useManrope,
} from "@expo-google-fonts/manrope";
import {
  NunitoSans_900Black,
  useFonts as useNunito,
} from "@expo-google-fonts/nunito-sans";
import * as Notifications from "expo-notifications";
import { router, Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { HeroUINativeProvider } from "heroui-native/provider";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";
// Registers the foreground notification handler.
import "../src/lib/expo-push-register";
import { AthleteBlocksProvider, useAthleteBlocks } from "../src/lib/athlete-blocks";
import { AuthProvider, useAuth } from "../src/lib/auth";
import {
  CompeteProvider,
  useCompeteFieldRefresh,
} from "../src/lib/compete-store";
import { shellTabFromPath } from "@fitness-battle/shared";
import { SHELL_COLORS } from "../src/theme";
import { BootGate } from "../src/ui/boot-gate";
import { NavigationWarmup } from "../src/lib/navigation-warmup";

function BlockPrivacyGate({ children }: { children: ReactNode }) {
  const { ready, error, reload } = useAthleteBlocks();
  const { signOut } = useAuth();
  if (ready) return children;
  return <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 16 }}>
    <Text style={textStyle("body")}>{error || "Loading your safety settings…"}</Text>
    {error ? <><Text accessibilityRole="button" onPress={() => void reload()} style={textStyle("label")}>Retry</Text><Text accessibilityRole="button" onPress={() => void signOut()} style={textStyle("label")}>Sign out</Text></> : null}
  </View>;
}

function LiveFieldRefresh() {
  const tab = shellTabFromPath(usePathname());
  useCompeteFieldRefresh(tab?.id === "today" || tab?.id === "arena" || tab?.id === "field");
  return null;
}

// Closes an in-app auth session when the OAuth deep link returns (web + native).
WebBrowser.maybeCompleteAuthSession();

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
  const SHELL_COLORS = useThemeColors();

  const [dmLoaded, dmError] = useDmSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });
  const [nunitoLoaded, nunitoError] = useNunito({ NunitoSans_900Black });
  const [manropeLoaded, manropeError] = useManrope({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  const fontsLoaded = manropeLoaded && dmLoaded && nunitoLoaded;
  const [fontLoadTimedOut, setFontLoadTimedOut] = useState(false);
  const fontError = manropeError ?? dmError ?? nunitoError;

  useEffect(() => {
    if (fontsLoaded || fontError) return;
    const timer = setTimeout(() => setFontLoadTimedOut(true), 15000);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (fontError) console.error("Overtaek startup: font loading failed", fontError);
    else if (fontLoadTimedOut && !fontsLoaded)
      console.warn("Overtaek startup: still waiting for bundled fonts", {
        dmLoaded,
        nunitoLoaded,
      });
  }, [fontError, fontLoadTimedOut, fontsLoaded, dmLoaded, nunitoLoaded]);

  useEffect(() => {
    // Browser study previews do not have a native notification response API.
    if (Platform.OS === "web") return;
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

  let fontFallback: ReactNode = null;
  if (!fontsLoaded) {
    fontFallback = (
      <View
        style={{
          flex: 1,
          backgroundColor: SHELL_COLORS.paper,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {fontError || fontLoadTimedOut ? (
          <View style={{ paddingHorizontal: 28, gap: 12, maxWidth: 420 }}>
            <Text style={{ ...textStyle("label"), textAlign: "center", color: SHELL_COLORS.ink }}>
              Fonts couldn’t load
            </Text>
            <Text style={{ ...textStyle("body"), textAlign: "center", color: SHELL_COLORS.ink }}>
              Reload the app in Expo Go. If this continues, check the Expo server logs for the font-loading error.
            </Text>
            {__DEV__ && fontError ? (
              <Text selectable style={{ ...textStyle("caption"), color: SHELL_COLORS.ink }}>
                {fontError.message}
              </Text>
            ) : null}
          </View>
        ) : (
          <ActivityIndicator color={SHELL_COLORS.tennis} />
        )}
      </View>
    );
  }

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: SHELL_COLORS.paper }}
    >
      <View style={{ flex: 1, maxWidth: 880, width: "100%", alignSelf: "center" }}>
        <HeroUINativeProvider>
          <AuthProvider>
            <AthleteBlocksProvider>
            <CompeteProvider navigationReady={fontsLoaded}>
              {fontsLoaded ? <BlockPrivacyGate>
                <>
                  <LiveFieldRefresh />
                  <NavigationWarmup />
                  <BootGate>
                    <StatusBar style="dark" />
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: SHELL_COLORS.paper },
                        animation:
                          Platform.OS === "ios" ? "default" : "slide_from_right",
                      }}
                    />
                  </BootGate>
                </>
              </BlockPrivacyGate> : fontFallback}
            </CompeteProvider>
            </AthleteBlocksProvider>
          </AuthProvider>
        </HeroUINativeProvider>
      </View>
    </GestureHandlerRootView>
  );
}
