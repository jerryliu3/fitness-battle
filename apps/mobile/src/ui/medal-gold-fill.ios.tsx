import { MEDAL_GOLD } from "@fitness-battle/shared";
import { PlatformColor, StyleSheet, View } from "react-native";

const wideGold = PlatformColor(MEDAL_GOLD.iosColorName, { fallback: "transparent" });

/** The parent keeps the solid sRGB fill if UIKit cannot resolve the named color. */
export function MedalGoldFill({ radius }: { radius: number }) {
  return <View pointerEvents="none" accessibilityElementsHidden style={[
    StyleSheet.absoluteFill,
    { backgroundColor: wideGold, borderRadius: radius },
  ]} />;
}
