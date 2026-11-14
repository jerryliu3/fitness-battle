import { View, type StyleProp, type ViewStyle } from "react-native";
import { EFFORT_BAR_COLOR_ROLES, EFFORT_BAR_HEIGHT_RATIOS, type EffortBarCount } from "@fitness-battle/shared";
import { useThemeColors } from "../theme";

export function EffortBarsIcon({
  bars,
  size = 64,
  style,
}: {
  bars: EffortBarCount;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useThemeColors();
  const maxBarHeight = Math.round(size * 0.72);
  const barWidth = Math.max(4, Math.round(size * 0.12));
  const gap = Math.max(2, Math.round(size * 0.06));
  const activeColor = c[EFFORT_BAR_COLOR_ROLES[Math.max(0, bars - 1)]!];

  return (
    <View
      accessible
      accessibilityLabel={`Effort ${bars} of 5`}
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
      {EFFORT_BAR_HEIGHT_RATIOS.map((ratio, index) => {
        const active = index < bars;
        const fill = active ? activeColor : c.divider;
        return (
          <View
            key={index}
            style={{
              width: barWidth,
              height: Math.max(5, Math.round(maxBarHeight * ratio)),
              borderRadius: Math.ceil(barWidth / 2),
              backgroundColor: fill,
              opacity: active ? 1 : 0.45,
            }}
          />
        );
      })}
    </View>
  );
}
