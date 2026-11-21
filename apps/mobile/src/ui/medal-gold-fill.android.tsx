import { MEDAL_GOLD } from "@fitness-battle/shared";
import { requireNativeView, requireOptionalNativeModule } from "expo";
import { StyleSheet, View, type ViewProps } from "react-native";

const GoldView = requireOptionalNativeModule("OvertaekMedalGold")
  ? requireNativeView<ViewProps & { channels: readonly number[] }>("OvertaekMedalGold")
  : null;

// The parent supplies the sRGB fill when this view cannot draw wide color.
export function MedalGoldFill({ radius }: { radius: number }) {
  return GoldView ? (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" }]}>
      <GoldView style={StyleSheet.absoluteFill} channels={MEDAL_GOLD.displayP3Channels} />
    </View>
  ) : null;
}
