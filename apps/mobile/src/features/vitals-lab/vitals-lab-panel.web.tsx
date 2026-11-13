import { VitalsLabExperience } from "@fitness-battle/pursuit/vitals-lab";
import { buildAnalyticsLabModel } from "@fitness-battle/shared";
import { useAppTheme } from "../../theme";
import { useMemo } from "react";
import { View } from "react-native";

/** Expo web: full Vitals Lab in-process (no WebView). */
export function VitalsLabPanel() {
  const { mode } = useAppTheme();
  const appearance = mode === "dark" ? "dark" : "light";
  const analytics = useMemo(
    () => buildAnalyticsLabModel("peak_build", "30d"),
    [],
  );

  return (
    <View style={{ borderRadius: 20, overflow: "hidden" }}>
      <VitalsLabExperience embedded analytics={analytics} appearance={appearance} />
    </View>
  );
}
