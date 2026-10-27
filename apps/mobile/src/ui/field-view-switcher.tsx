import { Pressable, Text, View } from "react-native";
import { textStyle } from "./section";
import { SHELL_COLORS as c } from "../theme";

export function FieldViewSwitcher({ value, geographic, onChange }: {
  value: "2d" | "3d" | "4d"; geographic: boolean; onChange(value: "2d" | "3d" | "4d"): void;
}) {
  const modes: ("2d" | "3d" | "4d")[] = geographic ? ["2d", "3d", "4d"] : ["2d", "3d"];
  return <View accessibilityLabel="Field view" style={{ flexDirection: "row", gap: 4 }}>
    {modes.map(mode => <Pressable key={mode}
      accessibilityRole="button" accessibilityLabel={`Switch to ${mode.toUpperCase()} ${mode === "4d" ? "course" : "field"}`}
      accessibilityState={{ selected: value === mode }} onPress={() => onChange(mode)}
      style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: value === mode ? c.tennis : "#ffffff" }}>
      <Text style={{ ...textStyle("label"), color: c.ink }}>{mode.toUpperCase()}</Text>
    </Pressable>)}
  </View>;
}
