import {
  activityTrainingXp,
  distanceUnitLabel,
  formatClockTime,
  formatDistanceM,
  formatTrainingXp,
  sportById,
  type Activity,
  type UnitSystem,
} from "@fitness-battle/shared";
import { Pressable, View } from "react-native";
import { prefetchActivityReplay } from "../lib/prefetch-activity-replay";
import { createThemedStyles, useThemeColors, useThemedStyles } from "../theme";
import { ActivityLeadingGraphic } from "./activity-leading-graphic";
import { AppText } from "./section";

function formatActivityDate(iso: string, timeZone: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  });
}

/** Shared activity list row for Journey recent activities and Activity History. */
export function ActivityListRow({
  activity,
  history,
  units,
  accessToken,
  surface = "card",
  timeZone,
  onPress,
}: {
  activity: Activity;
  history: readonly Activity[];
  units: UnitSystem;
  accessToken: string | null;
  surface?: "card" | "soft";
  timeZone: string;
  onPress: (activity: Activity) => void;
}) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);
  const sportInfo = sportById(activity.sport);
  const effort = formatTrainingXp(activityTrainingXp(activity));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sportInfo.name}, ${formatClockTime(activity.movingSec)}, ${effort} Training XP`}
      onPressIn={() => prefetchActivityReplay(activity, accessToken)}
      onPress={() => onPress(activity)}
      style={[s.activityRow, surface === "soft" && s.activityRowSoft]}
    >
      <ActivityLeadingGraphic
        activity={activity}
        routeActivity={activity}
        history={history}
        size={44}
      />
      <View style={s.metaCol}>
        <AppText role="row">{sportInfo.name}</AppText>
        <AppText role="caption" secondary>
          {formatActivityDate(activity.startedAt, timeZone)}
          {activity.distanceM > 0
            ? ` · ${formatDistanceM(activity.distanceM, units)} ${distanceUnitLabel(units)}`
            : ""}
        </AppText>
      </View>
      <View style={s.rightCol}>
        <AppText role="value" style={s.tabular}>
          {formatClockTime(activity.movingSec)}
        </AppText>
        <AppText role="label" style={{ color: c.tennis }}>
          {effort} XP
        </AppText>
      </View>
      <AppText role="caption" secondary style={s.chevron}>
        ›
      </AppText>
    </Pressable>
  );
}

const sThemes = createThemedStyles((c) => ({
  activityRow: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  activityRowSoft: {
    backgroundColor: c.soft,
  },
  metaCol: {
    flex: 1,
    gap: 2,
  },
  rightCol: {
    alignItems: "flex-end",
    gap: 2,
  },
  tabular: {
    fontVariant: ["tabular-nums"],
  },
  chevron: {
    marginLeft: 6,
  },
}));
