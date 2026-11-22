import { View } from "react-native";
import { nativeMedalGold } from "./medal-gold";
import { MedalGoldGamut } from "./medal-gold-gamut";

/** Decorative fill for a surface whose layout and foreground are owned by its caller. */
export function MedalGoldFill({ radius }: { radius: number }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
        backgroundColor: nativeMedalGold, borderRadius: radius, overflow: "hidden",
      }}
    >
      <MedalGoldGamut />
    </View>
  );
}
