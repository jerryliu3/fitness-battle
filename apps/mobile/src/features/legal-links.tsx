import { useThemeColors } from "../theme";
import { AppText, textStyle } from "../ui/section";
import * as WebBrowser from "expo-web-browser";
import { Linking, Pressable, Text, View } from "react-native";
import { mobileEnv } from "../lib/env";
import { legalPageUrl } from "./legal-page";

async function openLegal(path: "/privacy" | "/terms") {
  const url = legalPageUrl(mobileEnv.apiUrl, path);
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}

export function LegalLinks({ consent = false }: { consent?: boolean }) {
  const colors = useThemeColors();

  if (consent) {
    return (
      <Text style={{ ...textStyle("caption"), color: colors.muted }}>
        By continuing, you agree to our{" "}
        <Text
          accessibilityRole="link"
          onPress={() => void openLegal("/terms")}
          style={{ color: colors.ink, textDecorationLine: "underline" }}
        >
          Terms of Service
        </Text>{" "}
        and{" "}
        <Text
          accessibilityRole="link"
          onPress={() => void openLegal("/privacy")}
          style={{ color: colors.ink, textDecorationLine: "underline" }}
        >
          Privacy Policy
        </Text>
        .
      </Text>
    );
  }

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
      <Pressable
        accessibilityRole="link"
        onPress={() => void openLegal("/privacy")}
      >
        <AppText role="label">Privacy Policy</AppText>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        onPress={() => void openLegal("/terms")}
      >
        <AppText role="label">Terms of Service</AppText>
      </Pressable>
    </View>
  );
}
