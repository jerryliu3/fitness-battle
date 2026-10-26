import { View } from "react-native";
import {
  achievementProgressPercent,
  type ClubAchievement,
} from "@fitness-battle/shared";
import { SHELL_COLORS as c } from "../theme";

export function AchievementMeter({ row }: { row: ClubAchievement }) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
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
