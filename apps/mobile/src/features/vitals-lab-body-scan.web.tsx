import { VitalsLabExperience } from "@fitness-battle/pursuit/vitals-lab";
import { View } from "react-native";
import { useAppTheme } from "../theme";
import { AppText } from "../ui/section";

/** Expo web renders Vitals Lab in-process; native uses WebView embed. */
export function VitalsLabBodyScan({ signedOut = false }: { signedOut?: boolean }) {
  const { mode } = useAppTheme();
  const appearance = mode === "dark" ? "dark" : "light";

  if (signedOut) {
    return (
      <View style={{ padding: 16, borderRadius: 20, minHeight: 120, justifyContent: "center" }}>
        <AppText role="body" secondary>
          Sign in and connect a health tracker to unlock the interactive Vitals Lab body scan.
        </AppText>
      </View>
    );
  }

  return (
    <View style={{ minHeight: 720 }}>
      <VitalsLabExperience embedded appearance={appearance} />
    </View>
  );
}
