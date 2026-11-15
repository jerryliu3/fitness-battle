import { APP_ICON_PATHS } from "@fitness-battle/shared";
import { Pressable } from "react-native";
import Svg, { Path } from "react-native-svg";
import { playCue } from "../lib/haptics";

const mapChipStyle = {
  minHeight: 44,
  minWidth: 44,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  borderRadius: 999,
  backgroundColor: "rgba(20, 20, 19, 0.72)",
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.2)",
};

export function FieldFollowChip({
  following,
  athleteName,
  onPress,
}: {
  following: boolean;
  athleteName: string;
  onPress(): void;
}) {
  const label = following ? "Following selected athlete" : `Follow ${athleteName}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: following }}
      hitSlop={8}
      onPress={() => {
        void playCue(following ? "light" : "selection");
        onPress();
      }}
      style={({ pressed }) => [mapChipStyle, pressed && { opacity: 0.75 }]}
    >
      <Svg width={22} height={22} viewBox="0 0 256 256" accessible={false}>
        <Path
          d={following ? APP_ICON_PATHS.navigationArrowFill : APP_ICON_PATHS.navigationArrow}
          fill={following ? "#ffffff" : "none"}
          stroke={following ? "none" : "#ffffff"}
          strokeWidth={following ? 0 : 18}
          strokeLinejoin="round"
          fillRule={following ? "nonzero" : "evenodd"}
        />
      </Svg>
    </Pressable>
  );
}