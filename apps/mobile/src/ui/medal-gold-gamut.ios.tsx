import { MEDAL_GOLD } from "@fitness-battle/shared";
import { PlatformColor, StyleSheet, View } from "react-native";

const wideGold = PlatformColor(MEDAL_GOLD.iosColorName, { fallback: "transparent" });

export function MedalGoldGamut() {
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: wideGold }]} />;
}
