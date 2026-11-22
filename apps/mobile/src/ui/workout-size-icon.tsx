import { View, type StyleProp, type ViewStyle } from "react-native";
import { WORKOUT_SIZE_BAR_COLOR_ROLES, WORKOUT_SIZE_BAR_HEIGHT_RATIOS, type WorkoutSizeBarCount } from "@fitness-battle/shared";
import { useThemeColors } from "../theme";
import { MedalGoldFill } from "./medal-gold-fill";
import { nativeMedalGold } from "./medal-gold";

export function WorkoutSizeIcon({
  bars,
  size = 64,
  style,
}: {
  bars: WorkoutSizeBarCount;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useThemeColors();
  const maxBarHeight = Math.round(size * 0.72);
  const barWidth = Math.max(4, Math.round(size * 0.12));
  const gap = Math.max(2, Math.round(size * 0.06));
  const activeRole = WORKOUT_SIZE_BAR_COLOR_ROLES[Math.max(0, bars - 1)]!;
  const medalGold = activeRole === "actionPrimary";
  const activeColor = medalGold ? nativeMedalGold : c[activeRole];
  const radius = Math.ceil(barWidth / 2);

  return (
    <View
      accessible
      accessibilityLabel={`Session effort ${bars} of 5`}
      style={[
        {
          width: size,
          height: size,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: Math.round(size * 0.12),
          gap,
        },
        style,
      ]}
    >
      {WORKOUT_SIZE_BAR_HEIGHT_RATIOS.map((ratio, index) => {
        const active = index < bars;
        const fill = active ? activeColor : c.divider;
        return (
          <View
            key={index}
            style={{
              width: barWidth,
              height: Math.max(5, Math.round(maxBarHeight * ratio)),
              borderRadius: radius,
              backgroundColor: fill,
              opacity: active ? 1 : 0.45,
            }}
          >
            {active && medalGold && <MedalGoldFill radius={radius} />}
          </View>
        );
      })}
    </View>
  );
}
