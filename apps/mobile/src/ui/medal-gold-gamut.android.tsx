import { MEDAL_GOLD } from "@fitness-battle/shared";
import { requireNativeView, requireOptionalNativeModule } from "expo";
import { StyleSheet, type ViewProps } from "react-native";

const GoldView = requireOptionalNativeModule("OvertaekMedalGold")
  ? requireNativeView<ViewProps & { channels: readonly number[] }>("OvertaekMedalGold")
  : null;

export function MedalGoldGamut() {
  return GoldView ? <GoldView style={StyleSheet.absoluteFill} channels={MEDAL_GOLD.displayP3Channels} /> : null;
}
