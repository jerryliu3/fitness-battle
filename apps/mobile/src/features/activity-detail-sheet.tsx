import { useThemeColors } from "../theme";
import { FocusSheet } from "../ui/focus";
import { AppText } from "../ui/section";
import { ActivityRoute } from "../ui/activity-route";
import { View } from "react-native";
import {
  activityEffort,
  distanceUnitLabel,
  formatClockTime,
  formatDistanceM,
  formatEffort,
  sportById,
  type Activity,
  type UnitSystem,
} from "@fitness-battle/shared";

export function ActivityDetailSheet({
  activity,
  units,
  onClose,
}: {
  activity: Activity | null;
  units: UnitSystem;
  onClose: () => void;
}) {
  const c = useThemeColors();
  if (!activity) return null;
  return (
    <FocusSheet open title={sportById(activity.sport).name} onClose={onClose}>
      <View style={{ gap: 16, paddingVertical: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <View style={{ gap: 2 }}>
            <AppText role="caption" secondary>Duration</AppText>
            <AppText role="value" style={{ fontVariant: ["tabular-nums"] }}>
              {formatClockTime(activity.movingSec)}
            </AppText>
          </View>
          {activity.distanceM > 0 && (
            <View style={{ gap: 2 }}>
              <AppText role="caption" secondary>Distance</AppText>
              <AppText role="value" style={{ fontVariant: ["tabular-nums"] }}>
                {formatDistanceM(activity.distanceM, units)} {distanceUnitLabel(units)}
              </AppText>
            </View>
          )}
          <View style={{ gap: 2 }}>
            <AppText role="caption" secondary>Effort Earned</AppText>
            <AppText role="value" style={{ color: c.tennis, fontVariant: ["tabular-nums"] }}>
              {formatEffort(activityEffort(activity))} pts
            </AppText>
          </View>
        </View>
        <ActivityRoute activity={activity} units={units} />
      </View>
    </FocusSheet>
  );
}
