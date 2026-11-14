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
  const maxBarHeight = Math.round(size * 0.5);
  const barWidth = Math.max(3, Math.round(size * 0.085));
  const gap = Math.max(2, Math.round(size * 0.05));

  return (
    <View
      accessible
      accessibilityLabel={`Effort ${bars} of 5`}
      style={[
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.19),
          backgroundColor: c.paper,
          borderWidth: 1,
          borderColor: c.line,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: Math.round(size * 0.24),
          gap,
        },
        style,
      ]}
    >
      {EFFORT_BAR_HEIGHT_RATIOS.map((ratio, index) => {
        const active = index < bars;
        const fill = active ? c[EFFORT_BAR_COLOR_ROLES[index]!] : c.divider;
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
