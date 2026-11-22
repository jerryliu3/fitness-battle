import { View } from "react-native";
import { useThemeColors } from "../theme";
import { MedalGoldGamut } from "./medal-gold-gamut";

/** Decorative fill for a surface whose layout and foreground are owned by its caller. */
export function MedalGoldFill({ radius }: { radius: number }) {
  const c = useThemeColors();
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
        backgroundColor: c.actionPrimary, borderRadius: radius, overflow: "hidden",
      }}
    >
      <MedalGoldGamut />
    </View>
  );
}
