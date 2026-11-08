import { Switch, Text, View } from "react-native";
import { textStyle } from "./section";
import { useThemeColors } from "../theme";

export function SettingsToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange(): void }) {
  const c = useThemeColors();
  return <View style={{ width: "100%", minHeight: 48, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
    <Text style={{ ...textStyle("caption"), color: c.ink, flex: 1, flexShrink: 1 }}>{label}</Text>
    <View style={{ width: 52, height: 32, alignItems: "center", justifyContent: "center" }}>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ false: c.line, true: c.tennis }} />
    </View>
  </View>;
}
