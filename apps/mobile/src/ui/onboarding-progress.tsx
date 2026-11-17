import { View } from "react-native";
import { useThemeColors } from "../theme";
export function OnboardingProgress({ index, count }: { index: number; count: number }) {
  const c = useThemeColors();
  return <View accessibilityLabel={`Step ${index + 1} of ${count}`} style={{ flexDirection: "row", gap: 4, marginHorizontal: 16, marginTop: 4, marginBottom: 4, height: 3 }}>
    {Array.from({ length: count }, (_, i) => <View key={i} style={{ flex: 1, borderRadius: 3, backgroundColor: i <= index ? c.tennis : c.line }} />)}
  </View>;
}
