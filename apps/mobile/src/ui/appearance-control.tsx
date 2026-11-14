import { View } from "react-native";
import { useAppTheme } from "../appearance";
import { FocusSegments } from "./focus";
import { AppText } from "./section";
export function AppearanceControl() {
  const { preference, setPreference } = useAppTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <AppText role="label" style={{ flexShrink: 0 }}>Appearance</AppText>
      <View style={{ flex: 1, maxWidth: 210, transform: [{ scale: 0.92 }] }}>
        <FocusSegments
          label="Appearance"
          value={preference}
          onChange={setPreference}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </View>
    </View>
  );
}
