import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  useFonts as useDmSans,
} from "@expo-google-fonts/dm-sans";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider } from "../src/lib/auth-context";
import { CompeteProvider } from "../src/lib/compete-context";
import { colors } from "../src/theme";

export default function RootLayout() {
  const [dmLoaded] = useDmSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

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
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <CompeteProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.paper },
            animation: "fade",
          }}
        >
          <Stack.Screen name="(play)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="pace" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="rankings/index" />
          <Stack.Screen name="rankings/[distance]" />
          <Stack.Screen name="connections" />
        </Stack>
      </CompeteProvider>
    </AuthProvider>
  );
}
