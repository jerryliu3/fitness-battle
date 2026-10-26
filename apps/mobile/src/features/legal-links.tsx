import { AppText } from "../ui/section";
import * as WebBrowser from "expo-web-browser";
import { Linking, Pressable, View } from "react-native";
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

export function LegalLinks() {
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
