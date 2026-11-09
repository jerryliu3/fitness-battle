import { useId } from "react";
import { StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { WEEK_RECAP_COLORS as colors } from "@fitness-battle/shared";

/** Static, touch-transparent atmosphere; the recap's existing content owns input. */
export function WeekRecapBackground() {
  const id = `week-recap-${useId().replace(/:/g, "")}`;
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      pointerEvents="none"
      accessible={false}
    >
      <Defs>
        <RadialGradient id={id} cx="73%" cy="19%" rx="90%" ry="80%">
          <Stop offset="0" stopColor={colors.glow} />
          <Stop offset="0.24" stopColor={colors.warm} />
          <Stop offset="0.46" stopColor={colors.sage} />
          <Stop offset="0.77" stopColor={colors.background} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
      <Rect width="100%" height="100%" fill={colors.scrim} opacity={colors.scrimOpacity} />
    </Svg>
  );
}
