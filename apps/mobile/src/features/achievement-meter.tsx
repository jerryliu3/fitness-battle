import { useThemeColors } from "../theme";
import { View } from "react-native";
import {
  achievementProgressPercent,
  type ClubAchievement,
} from "@fitness-battle/shared";
import { SHELL_COLORS as c } from "../theme";

export function AchievementMeter({
  row,
  decorative = true,
}: {
  row: ClubAchievement;
  decorative?: boolean;
}) {
  const c = useThemeColors();

  return (
    <View
      importantForAccessibility={
        decorative ? "no-hide-descendants" : undefined
      }
      accessibilityElementsHidden={decorative ? true : undefined}
      style={{
        width: "100%",
        height: 4,
        borderRadius: 999,
        backgroundColor: c.soft,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: 4,
          width: `${achievementProgressPercent(row.fraction)}%`,
          backgroundColor: row.earned ? c.fieldTeal : c.tennis,
        }}
      />
    </View>
  );
}
