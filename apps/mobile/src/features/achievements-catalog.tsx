import { useThemedStyles } from "../theme";
import { useFocusStyles } from "../ui/focus";
import { createThemedStyles, useThemeColors } from "../theme";
import { SectionHeader, SectionStack, StatusBadge, AppText } from "../ui/section";
import { useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import {
  achievementAccessibilityLabel,
  clubAchievements,
  clubLifetimeTotals,
  competeNow,
  distanceUnitLabel,
  formatClockTime,
  formatDistanceM,
  personalRecordHistory,
  RECORD_DISTANCES,
  sportById,
  type ClubAchievement,
  type CompeteState,
} from "@fitness-battle/shared";
import { AchievementMeter } from "./achievement-meter";



function Badge({ item }: { item: ClubAchievement }) {
const c=useThemeColors();

  const id = `badge-${item.id}`;
  return (
    <Svg width={64} height={70} viewBox="0 0 84 92" accessible={Platform.OS === "web" ? undefined : false}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor={item.earned ? (item.category === "effort" ? "#ffe39a" : "#6bbab2") : c.soft} />
          <Stop offset="1" stopColor={item.earned ? (item.category === "effort" ? "#e4a82b" : c.fieldTeal) : c.line} />
        </LinearGradient>
      </Defs>
      <Path d="M42 4 76 22v43L42 87 8 65V22Z" fill={`url(#${id})`} stroke={c.card} strokeWidth={3} />
      <Path d="M42 13 68 27v33L42 77 16 60V27Z" fill="none" stroke="#ffffff88" strokeWidth={2} />
      <Path
        d={item.category === "sessions" ? "m42 27 5 11 12 2-9 8 2 13-10-6-11 6 2-13-9-8 13-2Z" : "m46 23-18 26h12l-3 20 21-29H45Z"}
        fill={c.card}
      />
    </Svg>
  );
}

export function AchievementsCatalog({
  state,
  initialId,
}: {
  state: CompeteState;
  initialId?: string;
}) {
  const c = useThemeColors();
  const f = useFocusStyles();

  const rows = clubAchievements(state);
  const now = competeNow(state);
  const season = clubLifetimeTotals(state);
  const unit = distanceUnitLabel(state.units);
  const topRecord = personalRecordHistory(state, now)[0];
  const [selected, setSelected] = useState(
    initialId && rows.some((row) => row.id === initialId)
      ? initialId
      : rows[0]?.id ?? "",
  );
  const item = rows.find((row) => row.id === selected) ?? rows[0];
  return (
    <ScrollView contentContainerStyle={[f.content, { paddingTop: 0, gap: 18, paddingBottom: 40 }]}>
<SectionStack divided={false}>
      {item ? (
        <View style={{ alignItems: "center", gap: 12 }}>
          <Badge item={item} />
          <AchievementMeter row={item} decorative={false} />
          <AppText role="heading" >
            {Math.min(item.current, item.target).toLocaleString()} / {item.target.toLocaleString()}
          </AppText>
          <AppText role="body" secondary >
            {item.category === "sessions"
              ? "Sessions currently in your activity history."
              : `${sportById(state.primary).name} · Open Effort Score.`}
          </AppText>
          <AppText role="body" secondary >
            {item.earned
              ? "Milestone reached. Keep building on it."
              : `${Math.max(0, item.target - item.current)} ${item.category === "sessions" ? "sessions" : "points"} to this milestone.`}
          </AppText>
        </View>
      ) : null}
      <AppText role="caption" secondary >
        Milestones reflect your current activity history and score. They do not grant rewards or change competition points.
      </AppText>
      {rows.map((row) => (
        <Pressable
          key={row.id}
          accessibilityRole="button"
          accessibilityState={{ selected: row.id === item?.id }}
          accessibilityLabel={achievementAccessibilityLabel(row)}
          onPress={() => setSelected(row.id)}
          style={[f.row, { minHeight: 72 }]}
        >
          <Badge item={row} />
          <View style={f.grow}>
            <AppText role="label" >{row.title}</AppText>
            <AchievementMeter row={row} />
            <AppText role="body" secondary >
              {row.target} {row.category === "sessions" ? "sessions" : "Open effort score"}
            </AppText>
          </View>
          <StatusBadge tone={row.earned ? "success" : "neutral"}>{row.earned ? "Earned" : "Up next"}</StatusBadge>
        </Pressable>
      ))}
      <View style={f.section}>
        <SectionHeader title="Since the first mile" subtitle="Counted training · 2026" />
        <View style={[f.row, { paddingVertical: 12, justifyContent: "space-around" }]}>
          <View style={{ alignItems: "center", gap: 4, flex: 1 }}>
            <AppText role="display">{formatDistanceM(season.meters, state.units)}</AppText>
            <AppText role="caption" secondary>{unit} total</AppText>
          </View>
          <View style={{ alignItems: "center", gap: 4, flex: 1 }}>
            <AppText role="display">{season.sessions}</AppText>
            <AppText role="caption" secondary>Sessions</AppText>
          </View>
          <View style={{ alignItems: "center", gap: 4, flex: 1 }}>
            <AppText role="display">{season.weeks}</AppText>
            <AppText role="caption" secondary>Active weeks</AppText>
          </View>
          <View style={{ alignItems: "center", gap: 4, flex: 1 }}>
            <AppText role="display">{state.lifetimeOvertakes ?? 0}</AppText>
            <AppText role="caption" secondary>Overtakes</AppText>
          </View>
        </View>
      </View>

      <View style={f.section}>
        <SectionHeader title="A few proud moments" subtitle="Milestones earned by showing up" />
        <View style={[f.row, { gap: 12 }]}>
          <View style={[f.card, { flex: 1, padding: 14, backgroundColor: c.card, gap: 4 }]}>
            <AppText role="label">Four weeks strong</AppText>
            <AppText role="caption" secondary>4 active weeks in a row</AppText>
          </View>
          {topRecord ? (
            <View style={[f.card, { flex: 1, padding: 14, backgroundColor: c.card, gap: 4 }]}>
              <AppText role="label">A new best</AppText>
              <AppText role="caption" secondary>
                {formatClockTime(topRecord.seconds)} · Fastest {RECORD_DISTANCES[topRecord.sport]?.find((d) => d.id === topRecord.distanceId)?.label ?? topRecord.distanceId}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </SectionStack>
</ScrollView>
  );
}

const achievementTileStyleThemes = createThemedStyles(themeColors=>{const c=themeColors;return {
  tile: {
    flex: 1,
    minWidth: 0,
    padding: 10,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    alignItems: "center",
    gap: 6,
  },
};});
export function useAchievementTileStyle() { return useThemedStyles(achievementTileStyleThemes); }
