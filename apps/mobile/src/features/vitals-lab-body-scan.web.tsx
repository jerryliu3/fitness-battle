import { buildAnalyticsLabModel } from "@fitness-battle/shared";
import { VitalsLabExperience } from "@fitness-battle/pursuit/vitals-lab";
import { useMemo } from "react";
import { View } from "react-native";
import { useAppTheme } from "../theme";

/** Expo web renders Vitals Lab in-process; native uses WebView embed. */
export function VitalsLabBodyScan({ signedOut = false }: { signedOut?: boolean }) {
  const { mode } = useAppTheme();
  const model = useMemo(
    () => (signedOut ? null : buildAnalyticsLabModel("peak_build", "30d")),
    [signedOut],
  );
  const appearance = mode === "dark" ? "dark" : "light";

  if (signedOut || !model) return null;

  return (
    <View style={{ minHeight: 720 }}>
      <VitalsLabExperience embedded analytics={model} appearance={appearance} />
    </View>
  );
}
