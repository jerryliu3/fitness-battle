import { ArchivoBlack_400Regular } from "@expo-google-fonts/archivo-black";
import { Bangers_400Regular } from "@expo-google-fonts/bangers";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider } from "../src/lib/auth-context";
import { CompeteProvider } from "../src/lib/compete-context";
import { colors } from "../src/theme";

export default function RootLayout() {
  const [loaded] = useFonts({
    ArchivoBlack_400Regular,
    Bangers_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  if (!loaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.plum,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.tennis} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <CompeteProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.plum },
            animation: "fade",
          }}
        >
          <Stack.Screen name="(play)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="pace" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="rankings/index" />
          <Stack.Screen name="rankings/[distance]" />
          <Stack.Screen name="connections" />
        </Stack>
      </CompeteProvider>
    </AuthProvider>
  );
}
